# MCC Discipline App - Reporting Service

## Overview
The Reporting Service provides comprehensive analytics and reporting capabilities for the Midlands Christian College Discipline App. It handles various export formats including PDF, interactive graphs, CSV, and Excel exports tailored for different user roles.

## Features

### Report Generation
- **PDF Reports**: Generate formatted PDF reports for students, classes, and incidents
- **Analytics Graphs**: Create interactive visualizations (bar, line, pie charts) for data analysis
- **CSV Export**: Export raw data in CSV format for admin analysis
- **Excel Export**: Generate Excel files for advanced data manipulation

### Advanced Capabilities
- **Report Scheduling**: Automate report generation on daily, weekly, or monthly schedules
- **Report Caching**: Optimize performance by caching frequently accessed reports
- **Custom Headers**: Specify custom column headers for CSV exports
- **Multiple Report Types**: Support for student, class, incident, and trend analysis reports

## Dependencies
The reporting service requires the following libraries (to be installed):

```bash
npm install jspdf chart.js papaparse @types/papaparse
```

## Usage Examples

### Generating a PDF Report
```typescript
import { generatePDFReport } from './reportingService';

// Sample student report data
const studentData = {
  studentId: 'S12345',
  name: 'John Smith',
  grade: '10A',
  incidents: [
    { date: '2023-06-01', type: 'Tardiness', points: 1 },
    { date: '2023-06-15', type: 'Disruptive Behavior', points: 3 }
  ],
  // ... other student data
};

// Generate PDF report
const pdfBuffer = await generatePDFReport('teacher123', studentData, 'student');

// Use the PDF buffer (e.g., save to file, send as attachment, etc.)
```

### Creating an Analytics Graph
```typescript
import { generateAnalyticsGraph } from './reportingService';

// Sample analytics data
const analyticsData = {
  labels: ['Tardiness', 'Disruptive Behavior', 'Dress Code', 'Phone Usage'],
  datasets: [{
    label: 'Incidents by Type',
    data: [42, 28, 15, 22],
    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
  }]
};

// Generate bar chart
const chartConfig = await generateAnalyticsGraph('admin456', analyticsData, 'bar');

// Use the chart configuration with Chart.js
```

### Exporting Data as CSV
```typescript
import { generateCSVExport } from './reportingService';

// Sample incident data
const incidentData = [
  { id: 1, date: '2023-06-01', studentName: 'John Smith', type: 'Tardiness', points: 1 },
  { id: 2, date: '2023-06-02', studentName: 'Emma Davis', type: 'Dress Code', points: 2 }
];

// Custom headers (optional)
const headers = ['id', 'date', 'studentName', 'type', 'points'];

// Generate CSV
const csvContent = await generateCSVExport(incidentData, headers);

// Use the CSV content
```

### Scheduling Automated Reports
```typescript
import { scheduleReport } from './reportingService';

// Schedule a weekly report
const reportId = await scheduleReport(
  'class',
  'weekly',
  ['teacher@example.com'],
  { gradeId: 'G10A' }
);

console.log(`Report scheduled with ID: ${reportId}`);
```

## Testing
A comprehensive test suite is available in `reportingService.test.ts` that demonstrates all functionality with sample data.

To run the tests:

```typescript
import { runAllTests } from './reportingService.test';

// Run all tests
runAllTests();

// Or run individual test functions
import { testPDFGeneration, testCSVExport } from './reportingService.test';
testPDFGeneration();
testCSVExport();
```

## Integration with Other Services
The Reporting Service is designed to work with other services in the application:

- **Authentication Service**: For user role verification before generating reports
- **Incident Service**: To fetch incident data for reports
- **User Management Service**: To retrieve user information for report distribution
- **Notification Service**: To notify users when scheduled reports are ready

## Future Enhancements
- Integration with email service for report distribution
- Interactive dashboard with real-time analytics
- Report templates customization
- Data visualization enhancements with more chart types
- Export to additional formats (e.g., PowerPoint, Google Sheets)