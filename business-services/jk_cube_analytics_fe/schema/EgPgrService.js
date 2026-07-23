/* eslint-disable no-undef */
cube(`EgPgrService`, {
  sql: `
   SELECT 
    eps.servicerequestid,
    eps.departmentname,
    eps.department,
    eps.category,
    eps.subcategory,
    eps.servicetype,
    eps.createdtime,
    eps.description,
    eps.fullname,
    eps.status,
    eps.source,
    eps.complaintsource,
    eps.complaintsourcesubtype,
    eps.phone,
    eps.comments,
    eps.ward,
    eps.premise,
    eps.streetname,
    eps.address,
    eps.employee_code,
    eps.employee_name,
    eps.office_name,
       CASE
    WHEN eps.servicetype = 0 THEN 'Grievance'
    WHEN eps.servicetype = 1 THEN 'BUILDING'
    ELSE 'Not valid Type'
END AS servicetypeName
FROM public.vw_grievances_dashboard eps
  `,

  joins: {},
  dataSource: `default`,
  // refreshKey: { every: `5 minutes` },

  measures: {
    // Total Grievances Count
    totalGrievances: {
      type: `count`,
      sql: `servicerequestid`,
      title: `Total Grievances`,
    },

    // Open Grievances
    openGrievances: {
      type: `count`,
      sql: `CASE WHEN status IN ('open', 'reassignrequested', 'escalatedlevel1pending', 'escalatedlevel2pending', 'pendingkmcgroapproval') THEN servicerequestid END`,
      title: `Open Grievances`,
    },

    // Assigned Grievances
    assignedGrievances: {
      type: `count`,
      sql: `CASE WHEN status IN ('assigned', 'escalatedlevel1assigned', 'escalatedlevel2assigned') THEN servicerequestid END`,
      title: `Assigned Grievances`,
    },

    // Resolved Grievances
    resolvedGrievances: {
      type: `count`,
      sql: `CASE WHEN status IN ('resolved', 'closed') THEN servicerequestid END`,
      title: `Resolved Grievances`,
    },

    // Rejected Grievances
    rejectedGrievances: {
      type: `count`,
      sql: `CASE WHEN status = 'rejected' THEN servicerequestid END`,
      title: `Rejected Grievances`,
    },

    // Attended Grievances
    attendedGrievances: {
      type: `count`,
      sql: `CASE WHEN status = 'attended' THEN servicerequestid END`,
      title: `Attended Grievances`,
    },

    // Cancelled Grievances
    cancelledGrievances: {
      type: `count`,
      sql: `CASE WHEN status = 'cancelled' THEN servicerequestid END`,
      title: `Cancelled Grievances`,
    },

    // Grievance Type - Grievance (servicetype = 0)
    grievanceTypeCount: {
      type: `countDistinct`,
      sql: `${CUBE}.servicerequestid`,
      filters: [
        { sql: `${CUBE}.servicetype = 0` }
      ],
      title: `Grievance Count`,
    },
    nagarBandhuCount: {
      type: `countDistinct`,
      sql: `${CUBE}.servicerequestid`,
      filters: [
        { sql: `${CUBE}.servicetype = 1` }
      ],
      title: `Nagar Bandhu Count`,
    },

    // Grievance Type - Nagar Bandhu (servicetype = 1)
    nagarBandhuCount1: {
      type: `count`,
      sql: `CASE WHEN servicetype = 1 THEN servicerequestid END`,
      title: `Nagar Bandhu Count`,
    },
    // Grievance Type - Nagar Bandhu (servicetype = 1)
    todayGrievanceCount: {
      type: `count`,
      sql: `CASE WHEN to_timestamp(createdtime / 1000.0)::date = CURRENT_DATE THEN servicerequestid END`,
      // sql: `CASE WHEN to_timestamp(createdtime / 1000.0)::date = '2025-08-06' THEN servicerequestid END`,
      title: `Today Grievance`,
    },

    // Source-wise counts
    // Web App - Only web source
    webSourceCount: {
      type: `count`,
      sql: `CASE WHEN source = 'web' THEN servicerequestid END`,
      title: `Web App Grievances`,
    },

    // WhatsApp - Only whatsapp source with servicetype = 0 (Grievance)
    whatsappSourceCount: {
      type: `count`,
      sql: `CASE WHEN source = 'whatsapp' AND servicetype = 0 THEN servicerequestid END`,
      title: `WhatsApp Grievances`,
      description: `WhatsApp grievances (servicetype = 0)`,
    },

    // Nagar Bandhu via WhatsApp - whatsapp source with servicetype = 1
    whatsappNagarBandhuCount: {
      type: `count`,
      sql: `CASE WHEN source = 'whatsapp' AND servicetype = 1 THEN servicerequestid END`,
      title: `WhatsApp Nagar Bandhu`,
      description: `Nagar Bandhu complaints via WhatsApp (servicetype = 1)`,
    },

    // Talk to Mayor
    talkToMayorCount: {
      type: `count`,
      sql: `CASE WHEN source = 'talktomayor' THEN servicerequestid END`,
      title: `Talk To Mayor`,
    },

    // Letter to Mayor
    letterToMayorCount: {
      type: `count`,
      sql: `CASE WHEN source = 'lettertomayor' THEN servicerequestid END`,
      title: `Letter To Mayor`,
    },

    // WhatsApp to Mayor
    whatsappToMayorCount: {
      type: `count`,
      sql: `CASE WHEN source = 'whatsapptomayor' THEN servicerequestid END`,
      title: `WhatsApp To Mayor`,
    },

    // KMC Call Centre
    kmcCallCentreCount: {
      type: `count`,
      sql: `CASE WHEN source = 'voicecallkmccentre' THEN servicerequestid END`,
      title: `KMC Call Centre`,
    },

    // Control Room
    controlRoomCount: {
      type: `count`,
      sql: `CASE WHEN source = 'voicecallcontrolroom' THEN servicerequestid END`,
      title: `KMC Control Room`,
    },

    // Outreach Program
    outreachCount: {
      type: `count`,
      sql: `CASE WHEN source = 'voicecallkmccentreoutreach' THEN servicerequestid END`,
      title: `Call Centre OutReach`,
    },

    // Today's Top Grievances Count (for today's department-wise breakdown)
    todayTopGrievanceCount: {
      type: `count`,
      sql: `CASE WHEN to_timestamp(createdtime / 1000.0)::date = CURRENT_DATE THEN servicerequestid END`,
      title: `Today Top Grievance Count`,
    },
  },

  dimensions: {


    // Service Request ID
    servicerequestid: {
      sql: `servicerequestid`,
      type: `string`,
      title: `Service Request ID`,
      primaryKey: true,
    },

    // Department Name
    departmentName: {
      sql: `departmentname`,
      type: 'string',
      title: 'Department Name',
    },

    // Department Code
    department: {
      sql: `${CUBE}.department`,
      type: `string`,
      title: `Department Code`,
    },

    // Category
    category: {
      sql: `category`,
      type: `string`,
      title: `Complaint Type`,
    },

    // Sub-category
    subcategory: {
      sql: `CASE WHEN subcategory IS NOT NULL THEN subcategory ELSE 'N/A' END`,
      type: `string`,
      title: `Complaint Sub-Type`,
    },

    // Service Type (Grievance/Nagar Bandhu)
    serviceType: {
      sql: `CASE WHEN servicetype = 0 THEN 'Grievance' WHEN servicetype = 1 THEN 'Nagar Bandhu' ELSE 'Other' END`,
      type: `string`,
      title: `Category`,
    },

    // Status
    status: {
      sql: `status`,
      type: `string`,
      title: `Status`,
    },

    // Formatted Status
    statusFormatted: {
      sql: `
        CASE
          WHEN status = 'open' THEN 'Open'
          WHEN status = 'assigned' THEN 'Assigned'
          WHEN status = 'closed' THEN 'Closed'
          WHEN status = 'cancelled' THEN 'Cancelled'
          WHEN status = 'rejected' THEN 'Rejected'
          WHEN status = 'reassignrequested' THEN 'Reassign Requested'
          WHEN status = 'resolved' THEN 'Resolved'
          WHEN status = 'escalatedlevel1pending' THEN 'Level 1 Escalation Pending'
          WHEN status = 'escalatedlevel1assigned' THEN 'Level 1 Escalation Assigned'
          WHEN status = 'escalatedlevel2pending' THEN 'Level 2 Escalation Pending'
          WHEN status = 'escalatedlevel2assigned' THEN 'Level 2 Escalation Assigned'
          WHEN status = 'pendingkmcgroapproval' THEN 'Pending KMC GRO Approval'
          WHEN status = 'attended' THEN 'Attended'
          ELSE status
        END
      `,
      type: `string`,
      title: `Status Label`,
    },

    // Source
    source: {
      sql: `source`,
      type: `string`,
      title: `Source`,
    },

    // Formatted Source
    sourceFormatted: {
      sql: `
        CASE
          WHEN source = 'web' THEN 'Web App'
          WHEN source = 'whatsapp' THEN 'Chat Bot'
          WHEN source = 'talktomayor' THEN 'Talk To Mayor'
          WHEN source = 'lettertomayor' THEN 'Letter To Mayor'
          WHEN source = 'whatsapptomayor' THEN 'WhatsApp To Mayor'
          WHEN source = 'voicecallkmccentre' THEN 'KMC Call Centre'
          WHEN source = 'voicecallcontrolroom' THEN 'KMC Control Room'
          WHEN source = 'voicecallkmccentreoutreach' THEN 'Call Centre OutReach'
          ELSE source
        END
      `,
      type: `string`,
      title: `Source Label`,
    },

    // Complaint Source
    complaintSource: {
      sql: `CASE WHEN complaintsource IS NOT NULL THEN complaintsource ELSE 'N/A' END`,
      type: `string`,
      title: `Complaint Source`,
    },

    // Complaint Source Sub-Type
    complaintSourceSubtype: {
      sql: `CASE WHEN complaintsourcesubtype IS NOT NULL THEN complaintsourcesubtype ELSE 'N/A' END`,
      type: `string`,
      title: `Complaint Source Sub-Type`,
    },

    // Description
    description: {
      sql: `description`,
      type: `string`,
      title: `Description`,
    },

    // Full Name (Applicant)
    fullname: {
      sql: `fullname`,
      type: `string`,
      title: `Applicant Name`,
    },

    // Phone
    phone: {
      sql: `phone`,
      type: `string`,
      title: `Phone Number`,
    },

    // Ward
    ward: {
      sql: `ward`,
      type: `string`,
      title: `Ward`,
    },

    // Premises
    premises: {
      sql: `premise`,
      type: `string`,
      title: `Premises`,
    },

    // Street Name
    streetName: {
      sql: `streetname`,
      type: `string`,
      title: `Street`,
    },

    // Address
    address: {
      sql: `address`,
      type: `string`,
      title: `Address`,
    },

    // Remarks (Comments from action table)
    remarks: {
      sql: `comments`,
      type: `string`,
      title: `Remarks`,
    },

    // Officer Name
    officerName: {
      sql: `COALESCE(employee_code || '-' || employee_name, employee_code || '-N/A', 'N/A')`,
      type: `string`,
      title: `Officer Name`,
    },

    // Office Name
    officeName: {
      sql: `COALESCE(office_name, 'N/A')`,
      type: `string`,
      title: `Office Name`,
    },

    // Created Date (Time Dimension)
    createdDate: {
      sql: `to_timestamp(${CUBE}.createdtime / 1000.0)`,
      type: `time`,
      title: `Created Date`,
    },
    systemDate: {
      sql: `to_timestamp(${CUBE}.createdtime / 1000.0)`,
      type: `time`,
      title: `Created Date`,
    },

    // Submission Date Formatted
    submissionDateFormatted: {
      sql: `"Submission Date"`,
      type: `string`,
      title: `Submission Date`,
    },
    servicetypeName: {
      sql: `servicetypename`,
      type: `string`,
      title: `Servicetype Name`,
    },
  },

  // Pre-aggregations temporarily disabled for debugging
  // preAggregations: {
  //   main: {
  //     measures: [
  //       EgPgrService.totalGrievances,
  //       EgPgrService.openGrievances,
  //       EgPgrService.assignedGrievances,
  //       EgPgrService.resolvedGrievances,
  //       EgPgrService.rejectedGrievances,
  //     ],
  //     dimensions: [
  //       EgPgrService.departmentName,
  //       EgPgrService.serviceType,
  //       EgPgrService.sourceFormatted,
  //       EgPgrService.statusFormatted,
  //     ],
  //     timeDimension: EgPgrService.createdDate,
  //     granularity: `day`,
  //     refreshKey: {
  //       every: `1 hour`,
  //     },
  //   },
  // },
});
