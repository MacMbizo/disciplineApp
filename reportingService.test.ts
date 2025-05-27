// Test file for reportingService.ts
// This file demonstrates how to use the reporting service functions
// and validates their behavior with sample data

import {
  generatePDFReport,
  generateAnalyticsGraph,
  generateCSVExport,
  generateExcelExport,
  scheduleReport,
  cacheReport
} from './reportingService';

/**
 * Test function to demonstrate PDF report generation
 */
async function testPDFGeneration() {
  try {
    // Sample student report data
    const studentReportData = {
      studentId: 'S12345',
      name: 'John Smith',
      grade: '10A',
      incidents: [
        { date: '2023-06-01', type: 'Tardiness', points: 1, teacher: 'Ms. Johnson' },
        { date: '2023-06-15', type: 'Disruptive Behavior', points: 3, teacher: 'Mr. Davis' }
      ],
      merits: [
        { date: '2023-06-10', description: 'Helping classmate', points: 2, teacher: 'Ms. Johnson' }
      ],
      totalDemeritPoints: 4,
      totalMeritPoints: 2,
      netPoints: -2
    };

    // Generate student PDF report
    const pdfBuffer = await generatePDFReport('teacher123', studentReportData, 'student');
    console.log('PDF report generated successfully:', pdfBuffer.length, 'bytes');
    
    // In a real application, we would save this to a file or send it to the user
    // For example: fs.writeFileSync('student_report.pdf', pdfBuffer);
    
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation test failed:', error);
    throw error;
  }
}

/**
 * Test function to demonstrate analytics graph generation
 */
async function testGraphGeneration() {
  try {
    // Sample analytics data for a bar chart
    const incidentAnalyticsData = {
      labels: ['Tardiness', 'Disruptive Behavior', 'Dress Code', 'Phone Usage', 'Other'],
      datasets: [
        {
          label: 'Incidents by Type (June 2023)',
          data: [42, 28, 15, 22, 8],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }
      ]
    };

    // Generate bar chart
    const barChartConfig = await generateAnalyticsGraph('admin456', incidentAnalyticsData, 'bar');
    console.log('Bar chart generated successfully');
    
    // Sample data for a line chart showing trends
    const trendAnalyticsData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: [
        {
          label: 'Total Incidents',
          data: [65, 59, 80, 81, 56, 55],
          borderColor: '#FF6384',
          fill: false
        },
        {
          label: 'Total Merits',
          data: [28, 48, 40, 19, 86, 27],
          borderColor: '#36A2EB',
          fill: false
        }
      ]
    };

    // Generate line chart
    const lineChartConfig = await generateAnalyticsGraph('admin456', trendAnalyticsData, 'line');
    console.log('Line chart generated successfully');
    
    return { barChartConfig, lineChartConfig };
  } catch (error) {
    console.error('Graph generation test failed:', error);
    throw error;
  }
}

/**
 * Test function to demonstrate CSV export
 */
async function testCSVExport() {
  try {
    // Sample incident data for CSV export
    const incidentData = [
      { id: 1, date: '2023-06-01', studentId: 'S12345', studentName: 'John Smith', type: 'Tardiness', points: 1, teacherId: 'T789', teacherName: 'Ms. Johnson' },
      { id: 2, date: '2023-06-02', studentId: 'S12346', studentName: 'Emma Davis', type: 'Dress Code', points: 2, teacherId: 'T790', teacherName: 'Mr. Wilson' },
      { id: 3, date: '2023-06-03', studentId: 'S12347', studentName: 'Michael Brown', type: 'Phone Usage', points: 2, teacherId: 'T791', teacherName: 'Mrs. Taylor' },
      { id: 4, date: '2023-06-15', studentId: 'S12345', studentName: 'John Smith', type: 'Disruptive Behavior', points: 3, teacherId: 'T792', teacherName: 'Mr. Davis' }
    ];

    // Custom headers for the CSV
    const customHeaders = ['id', 'date', 'studentName', 'type', 'points', 'teacherName'];

    // Generate CSV with custom headers
    const csvContent = await generateCSVExport(incidentData, customHeaders);
    console.log('CSV export generated successfully');
    console.log(csvContent.substring(0, 200) + '...');
    
    return csvContent;
  } catch (error) {
    console.error('CSV export test failed:', error);
    throw error;
  }
}

/**
 * Test function to demonstrate Excel export
 */
async function testExcelExport() {
  try {
    // Sample merit data for Excel export
    const meritData = [
      { id: 1, date: '2023-06-10', studentId: 'S12345', studentName: 'John Smith', description: 'Helping classmate', points: 2, teacherId: 'T789', teacherName: 'Ms. Johnson' },
      { id: 2, date: '2023-06-12', studentId: 'S12346', studentName: 'Emma Davis', description: 'Outstanding project', points: 5, teacherId: 'T790', teacherName: 'Mr. Wilson' },
      { id: 3, date: '2023-06-14', studentId: 'S12347', studentName: 'Michael Brown', description: 'Volunteer work', points: 3, teacherId: 'T791', teacherName: 'Mrs. Taylor' }
    ];

    // Generate Excel file
    const excelBuffer = await generateExcelExport(meritData, 'Merit Records');
    console.log('Excel export generated successfully:', excelBuffer.length, 'bytes');
    
    return excelBuffer;
  } catch (error) {
    console.error('Excel export test failed:', error);
    throw error;
  }
}

/**
 * Test function to demonstrate report scheduling
 */
async function testReportScheduling() {
  try {
    // Schedule a weekly student report for a parent
    const studentReportId = await scheduleReport(
      'student',
      'weekly',
      ['parent@example.com'],
      { studentId: 'S12345' }
    );
    console.log('Student report scheduled successfully, ID:', studentReportId);
    
    // Schedule a monthly class summary for a teacher
    const classReportId = await scheduleReport(
      'class',
      'monthly',
      ['teacher@example.com'],
      { gradeId: 'G10A' }
    );
    console.log('Class report scheduled successfully, ID:', classReportId);
    
    return { studentReportId, classReportId };
  } catch (error) {
    console.error('Report scheduling test failed:', error);
    throw error;
  }
}

/**
 * Test function to demonstrate report caching
 */
async function testReportCaching() {
  try {
    // Generate a report first
    const studentReportData = {
      studentId: 'S12345',
      name: 'John Smith',
      grade: '10A',
      // ... other data
    };
    
    const pdfBuffer = await generatePDFReport('teacher123', studentReportData, 'student');
    
    // Cache the report for 30 minutes
    const reportId = 'student-S12345-' + Date.now();
    const cacheSuccess = await cacheReport(reportId, pdfBuffer, 30);
    
    console.log('Report caching result:', cacheSuccess ? 'Success' : 'Failed');
    
    return { reportId, cacheSuccess };
  } catch (error) {
    console.error('Report caching test failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('===== REPORTING SERVICE TESTS =====');
  
  console.log('\n----- PDF Report Generation Test -----');
  await testPDFGeneration();
  
  console.log('\n----- Analytics Graph Generation Test -----');
  await testGraphGeneration();
  
  console.log('\n----- CSV Export Test -----');
  await testCSVExport();
  
  console.log('\n----- Excel Export Test -----');
  await testExcelExport();
  
  console.log('\n----- Report Scheduling Test -----');
  await testReportScheduling();
  
  console.log('\n----- Report Caching Test -----');
  await testReportCaching();
  
  console.log('\n===== ALL TESTS COMPLETED =====');
}

// Uncomment to run all tests
// runAllTests().catch(error => console.error('Test suite failed:', error));

// Export test functions for individual use
export {
  testPDFGeneration,
  testGraphGeneration,
  testCSVExport,
  testExcelExport,
  testReportScheduling,
  testReportCaching,
  runAllTests
};