/**
 * Reporting Service for MCC Discipline Tracker
 * 
 * This service handles report generation, analytics, and data visualization
 * for discipline incidents. Provides comprehensive reporting functionality
 * for administrators, teachers, and principals.
 * 
 * @fileoverview Reporting and analytics service
 * @author MCC Discipline Tracker Team
 * @version 1.0.0
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db, Collections } from '../config/firebaseConfig';
import {
  disciplineService,
  DisciplineIncident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentStatistics,
} from './disciplineService';
import { userService } from './userService';

/**
 * Interface for report filters
 */
export interface ReportFilters {
  schoolId: string;
  dateFrom: Date;
  dateTo: Date;
  studentId?: string;
  teacherId?: string;
  incidentType?: IncidentType;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
}

/**
 * Interface for trend data point
 */
export interface TrendDataPoint {
  date: string;
  count: number;
  severity?: IncidentSeverity;
  type?: IncidentType;
}

/**
 * Interface for student behavior report
 */
export interface StudentBehaviorReport {
  studentId: string;
  studentName: string;
  totalIncidents: number;
  incidentsByType: Record<IncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  lastIncidentDate?: Date;
  improvementTrend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Interface for teacher performance report
 */
export interface TeacherPerformanceReport {
  teacherId: string;
  teacherName: string;
  totalIncidents: number;
  incidentsReported: number;
  averageResolutionTime: number; // in days
  followUpCompliance: number; // percentage
  parentNotificationRate: number; // percentage
}

/**
 * Interface for comprehensive school report
 */
export interface SchoolReport {
  schoolId: string;
  reportPeriod: {
    from: Date;
    to: Date;
  };
  overview: IncidentStatistics;
  trends: {
    daily: TrendDataPoint[];
    weekly: TrendDataPoint[];
    monthly: TrendDataPoint[];
  };
  topStudents: StudentBehaviorReport[];
  teacherPerformance: TeacherPerformanceReport[];
  recommendations: string[];
}

/**
 * Interface for export options
 */
export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  includeCharts: boolean;
  includeDetails: boolean;
}

/**
 * Reporting service class providing comprehensive analytics and reporting functionality
 */
export class ReportingService {
  private static instance: ReportingService;

  /**
   * Singleton pattern implementation
   * @returns ReportingService instance
   */
  public static getInstance(): ReportingService {
    if (!ReportingService.instance) {
      ReportingService.instance = new ReportingService();
    }
    return ReportingService.instance;
  }

  private constructor() {}

  /**
   * Generate comprehensive school report
   * @param schoolId - School identifier
   * @param dateFrom - Report start date
   * @param dateTo - Report end date
   * @returns Promise resolving to comprehensive school report
   * @throws ReportingServiceError for generation failures
   */
  public async generateSchoolReport(
    schoolId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<SchoolReport> {
    try {
      // Get overview statistics
      const overview = await disciplineService.getIncidentStatistics(schoolId, dateFrom, dateTo);

      // Get trend data
      const trends = await this.generateTrendData(schoolId, dateFrom, dateTo);

      // Get top students with most incidents
      const topStudents = await this.getTopStudentsByIncidents(schoolId, dateFrom, dateTo, 10);

      // Get teacher performance data
      const teacherPerformance = await this.getTeacherPerformanceData(schoolId, dateFrom, dateTo);

      // Generate recommendations
      const recommendations = this.generateRecommendations(overview, trends, topStudents);

      const report: SchoolReport = {
        schoolId,
        reportPeriod: { from: dateFrom, to: dateTo },
        overview,
        trends,
        topStudents,
        teacherPerformance,
        recommendations,
      };

      console.log('School report generated successfully for:', schoolId);
      return report;
    } catch (error) {
      console.error('Error generating school report:', error);
      throw new ReportingServiceError('Failed to generate school report', 'generate-report-failed');
    }
  }

  /**
   * Generate student behavior report
   * @param studentId - Student identifier
   * @param schoolId - School identifier
   * @param dateFrom - Report start date
   * @param dateTo - Report end date
   * @returns Promise resolving to student behavior report
   * @throws ReportingServiceError for generation failures
   */
  public async generateStudentReport(
    studentId: string,
    schoolId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<StudentBehaviorReport> {
    try {
      const incidents = await this.getStudentIncidents(studentId, schoolId, dateFrom, dateTo);
      
      // Calculate statistics
      const incidentsByType: Record<IncidentType, number> = {} as Record<IncidentType, number>;
      const incidentsBySeverity: Record<IncidentSeverity, number> = {} as Record<IncidentSeverity, number>;
      
      // Initialize counters
      Object.values(IncidentType).forEach(type => {
        incidentsByType[type] = 0;
      });
      Object.values(IncidentSeverity).forEach(severity => {
        incidentsBySeverity[severity] = 0;
      });

      let lastIncidentDate: Date | undefined;
      
      incidents.forEach(incident => {
        incidentsByType[incident.incidentType]++;
        incidentsBySeverity[incident.severity]++;
        
        if (!lastIncidentDate || incident.dateTime > lastIncidentDate) {
          lastIncidentDate = incident.dateTime;
        }
      });

      // Calculate improvement trend
      const improvementTrend = this.calculateImprovementTrend(incidents);
      
      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(incidents, incidentsBySeverity);

      const report: StudentBehaviorReport = {
        studentId,
        studentName: incidents[0]?.studentName || 'Unknown Student',
        totalIncidents: incidents.length,
        incidentsByType,
        incidentsBySeverity,
        lastIncidentDate,
        improvementTrend,
        riskLevel,
      };

      return report;
    } catch (error) {
      console.error('Error generating student report:', error);
      throw new ReportingServiceError('Failed to generate student report', 'generate-student-report-failed');
    }
  }

  /**
   * Generate trend data for incidents
   * @param schoolId - School identifier
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise resolving to trend data
   */
  private async generateTrendData(
    schoolId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    daily: TrendDataPoint[];
    weekly: TrendDataPoint[];
    monthly: TrendDataPoint[];
  }> {
    try {
      const incidents = await this.getAllIncidents(schoolId, dateFrom, dateTo);
      
      // Generate daily trends
      const daily = this.aggregateByPeriod(incidents, 'day');
      
      // Generate weekly trends
      const weekly = this.aggregateByPeriod(incidents, 'week');
      
      // Generate monthly trends
      const monthly = this.aggregateByPeriod(incidents, 'month');

      return { daily, weekly, monthly };
    } catch (error) {
      console.error('Error generating trend data:', error);
      throw new ReportingServiceError('Failed to generate trend data', 'generate-trends-failed');
    }
  }

  /**
   * Get top students by incident count
   * @param schoolId - School identifier
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @param limit - Number of students to return
   * @returns Promise resolving to array of student behavior reports
   */
  private async getTopStudentsByIncidents(
    schoolId: string,
    dateFrom: Date,
    dateTo: Date,
    limit: number
  ): Promise<StudentBehaviorReport[]> {
    try {
      const incidents = await this.getAllIncidents(schoolId, dateFrom, dateTo);
      
      // Group incidents by student
      const studentIncidents: Record<string, DisciplineIncident[]> = {};
      
      incidents.forEach(incident => {
        if (!studentIncidents[incident.studentId]) {
          studentIncidents[incident.studentId] = [];
        }
        studentIncidents[incident.studentId].push(incident);
      });

      // Generate reports for each student
      const studentReports: StudentBehaviorReport[] = [];
      
      for (const [studentId, studentIncidentList] of Object.entries(studentIncidents)) {
        const report = await this.generateStudentReport(studentId, schoolId, dateFrom, dateTo);
        studentReports.push(report);
      }

      // Sort by incident count and return top students
      return studentReports
        .sort((a, b) => b.totalIncidents - a.totalIncidents)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top students:', error);
      throw new ReportingServiceError('Failed to get top students', 'get-top-students-failed');
    }
  }

  /**
   * Get teacher performance data
   * @param schoolId - School identifier
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise resolving to teacher performance reports
   */
  private async getTeacherPerformanceData(
    schoolId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<TeacherPerformanceReport[]> {
    try {
      const incidents = await this.getAllIncidents(schoolId, dateFrom, dateTo);
      const teachers = await userService.getUsersBySchool(schoolId, 'teacher');
      
      const performanceReports: TeacherPerformanceReport[] = [];
      
      for (const teacher of teachers) {
        const teacherIncidents = incidents.filter(incident => incident.teacherId === teacher.uid);
        
        // Calculate metrics
        const totalIncidents = teacherIncidents.length;
        const incidentsReported = teacherIncidents.length; // All incidents are reported by definition
        
        // Calculate average resolution time
        const resolvedIncidents = teacherIncidents.filter(incident => 
          incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.CLOSED
        );
        
        const averageResolutionTime = resolvedIncidents.length > 0 
          ? resolvedIncidents.reduce((sum, incident) => {
              const resolutionTime = (incident.updatedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60 * 60 * 24);
              return sum + resolutionTime;
            }, 0) / resolvedIncidents.length
          : 0;
        
        // Calculate follow-up compliance
        const followUpRequired = teacherIncidents.filter(incident => incident.followUpRequired);
        const followUpCompleted = followUpRequired.filter(incident => 
          incident.status === IncidentStatus.RESOLVED || incident.status === IncidentStatus.CLOSED
        );
        const followUpCompliance = followUpRequired.length > 0 
          ? (followUpCompleted.length / followUpRequired.length) * 100 
          : 100;
        
        // Calculate parent notification rate
        const parentNotificationRate = totalIncidents > 0 
          ? (teacherIncidents.filter(incident => incident.parentNotified).length / totalIncidents) * 100 
          : 100;

        performanceReports.push({
          teacherId: teacher.uid,
          teacherName: teacher.displayName || 'Unknown Teacher',
          totalIncidents,
          incidentsReported,
          averageResolutionTime,
          followUpCompliance,
          parentNotificationRate,
        });
      }

      return performanceReports.sort((a, b) => b.totalIncidents - a.totalIncidents);
    } catch (error) {
      console.error('Error getting teacher performance data:', error);
      throw new ReportingServiceError('Failed to get teacher performance data', 'get-teacher-performance-failed');
    }
  }

  /**
   * Get all incidents for a school within date range
   * @param schoolId - School identifier
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise resolving to array of incidents
   */
  private async getAllIncidents(
    schoolId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<DisciplineIncident[]> {
    const allIncidents: DisciplineIncident[] = [];
    let hasMore = true;
    let lastDoc;

    while (hasMore) {
      const result = await disciplineService.searchIncidents(
        { schoolId, dateFrom, dateTo },
        100,
        lastDoc
      );
      
      allIncidents.push(...result.incidents);
      hasMore = result.hasMore;
      lastDoc = result.lastDoc;
    }

    return allIncidents;
  }

  /**
   * Get incidents for a specific student
   * @param studentId - Student identifier
   * @param schoolId - School identifier
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Promise resolving to array of incidents
   */
  private async getStudentIncidents(
    studentId: string,
    schoolId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<DisciplineIncident[]> {
    const result = await disciplineService.searchIncidents(
      { studentId, schoolId, dateFrom, dateTo },
      1000 // Large limit to get all incidents
    );
    
    return result.incidents;
  }

  /**
   * Aggregate incidents by time period
   * @param incidents - Array of incidents
   * @param period - Time period ('day', 'week', 'month')
   * @returns Array of trend data points
   */
  private aggregateByPeriod(incidents: DisciplineIncident[], period: 'day' | 'week' | 'month'): TrendDataPoint[] {
    const aggregated: Record<string, number> = {};
    
    incidents.forEach(incident => {
      let key: string;
      const date = incident.dateTime;
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      aggregated[key] = (aggregated[key] || 0) + 1;
    });

    return Object.entries(aggregated)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate improvement trend for a student
   * @param incidents - Student's incidents
   * @returns Improvement trend
   */
  private calculateImprovementTrend(incidents: DisciplineIncident[]): 'improving' | 'stable' | 'declining' {
    if (incidents.length < 2) return 'stable';
    
    // Sort incidents by date
    const sortedIncidents = incidents.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    
    // Compare first half with second half
    const midpoint = Math.floor(sortedIncidents.length / 2);
    const firstHalf = sortedIncidents.slice(0, midpoint);
    const secondHalf = sortedIncidents.slice(midpoint);
    
    const firstHalfSeverity = this.calculateAverageSeverity(firstHalf);
    const secondHalfSeverity = this.calculateAverageSeverity(secondHalf);
    
    if (secondHalfSeverity < firstHalfSeverity - 0.5) return 'improving';
    if (secondHalfSeverity > firstHalfSeverity + 0.5) return 'declining';
    return 'stable';
  }

  /**
   * Calculate risk level for a student
   * @param incidents - Student's incidents
   * @param incidentsBySeverity - Incidents grouped by severity
   * @returns Risk level
   */
  private calculateRiskLevel(
    incidents: DisciplineIncident[],
    incidentsBySeverity: Record<IncidentSeverity, number>
  ): 'low' | 'medium' | 'high' {
    const totalIncidents = incidents.length;
    const highSeverityIncidents = incidentsBySeverity[IncidentSeverity.HIGH] + incidentsBySeverity[IncidentSeverity.CRITICAL];
    
    if (totalIncidents >= 10 || highSeverityIncidents >= 3) return 'high';
    if (totalIncidents >= 5 || highSeverityIncidents >= 1) return 'medium';
    return 'low';
  }

  /**
   * Calculate average severity score
   * @param incidents - Array of incidents
   * @returns Average severity score
   */
  private calculateAverageSeverity(incidents: DisciplineIncident[]): number {
    if (incidents.length === 0) return 0;
    
    const severityScores = {
      [IncidentSeverity.LOW]: 1,
      [IncidentSeverity.MEDIUM]: 2,
      [IncidentSeverity.HIGH]: 3,
      [IncidentSeverity.CRITICAL]: 4,
    };
    
    const totalScore = incidents.reduce((sum, incident) => sum + severityScores[incident.severity], 0);
    return totalScore / incidents.length;
  }

  /**
   * Generate recommendations based on report data
   * @param overview - Incident statistics
   * @param trends - Trend data
   * @param topStudents - Top students by incidents
   * @returns Array of recommendations
   */
  private generateRecommendations(
    overview: IncidentStatistics,
    trends: any,
    topStudents: StudentBehaviorReport[]
  ): string[] {
    const recommendations: string[] = [];
    
    // High incident rate recommendation
    if (overview.totalIncidents > 100) {
      recommendations.push('Consider implementing school-wide behavior intervention programs due to high incident rate.');
    }
    
    // Follow-up compliance recommendation
    if (overview.followUpRequired > overview.totalIncidents * 0.3) {
      recommendations.push('Improve follow-up procedures - many incidents require follow-up actions.');
    }
    
    // Parent notification recommendation
    if (overview.parentNotificationPending > overview.totalIncidents * 0.2) {
      recommendations.push('Enhance parent communication - many incidents lack parent notification.');
    }
    
    // High-risk students recommendation
    const highRiskStudents = topStudents.filter(student => student.riskLevel === 'high');
    if (highRiskStudents.length > 0) {
      recommendations.push(`Focus on ${highRiskStudents.length} high-risk students who need intensive intervention.`);
    }
    
    // Trending incident types
    const topIncidentType = Object.entries(overview.incidentsByType)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topIncidentType && topIncidentType[1] > overview.totalIncidents * 0.3) {
      recommendations.push(`Address ${topIncidentType[0]} incidents specifically - they represent the majority of cases.`);
    }

    return recommendations;
  }
}

/**
 * Custom error class for reporting service-related errors
 */
export class ReportingServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReportingServiceError';
    this.code = code;
  }
}

/**
 * Export singleton instance for easy access
 */
export const reportingService = ReportingService.getInstance();

/**
 * Export types for external use
 */
export type {
  ReportFilters,
  TrendDataPoint,
  StudentBehaviorReport,
  TeacherPerformanceReport,
  SchoolReport,
  ExportOptions,
};