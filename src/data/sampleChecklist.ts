import {Checklist} from '../types/checklist';

// Sample checklist data matching the example from the configuration screen
export const sampleChecklist: Checklist = {
  id: 'checklist-001',
  name: 'Hazardous Waste Pickup Checklist',
  description: 'Standard checklist for hazardous waste pickup operations',
  customerId: 'CUST-001',
  customerName: 'Acme',
  status: 'Active',
  questions: [
    {
      id: 'Q1_SITE_ACCESS',
      text: 'Is the site accessible for standard pickup truck?',
      description: 'Check if standard equipment can access the pickup location',
      type: 'Yes/No/NA',
      required: true,
      tags: ['SITE_ACCESS', 'Yes/No/NA', 'Required', 'Site Assessment'],
      conditionalQuestions: [
        {
          branch: 'IF NO',
          question: {
            id: 'Q1_EQUIP_REQ',
            text: 'What type of equipment is required?',
            type: 'Single Choice',
            required: true,
            tags: ['EQUIP_REQ', 'Single Choice', 'Required'],
            choices: [
              {id: 'forklift', label: 'Forklift'},
              {id: 'crane', label: 'Crane'},
              {id: 'special-lift', label: 'Special Lift Gate'},
              {id: 'other', label: 'Other'},
            ],
          },
        },
      ],
    },
    {
      id: 'Q2_LABEL_CHECK',
      text: 'Are all containers properly labeled?',
      description: 'Verify all containers have proper hazard labels and identification',
      type: 'Yes/No/NA',
      required: true,
      tags: ['LABEL_CHECK', 'Yes/No/NA', 'Required', 'Container Inspection'],
      conditionalQuestions: [
        {
          branch: 'IF NO',
          question: {
            id: 'Q_UNLABELED',
            text: 'Which containers need labeling?',
            type: 'Multiple Choice',
            required: true,
            tags: ['UNLABELED', 'Multiple Choice', 'Required'],
            choices: [
              {id: 'drums', label: 'Drums'},
              {id: 'tanks', label: 'Tanks'},
              {id: 'totes', label: 'Totes'},
              {id: 'small-containers', label: 'Small Containers'},
            ],
          },
        },
        {
          branch: 'IF NO',
          question: {
            id: 'Q2_CUST_NOTIF',
            text: 'Was customer notified of labeling requirements?',
            type: 'Yes/No/NA',
            required: true,
            tags: ['CUST_NOTIF', 'Yes/No/NA', 'Required'],
          },
        },
      ],
    },
    {
      id: 'Q3_CONT_COUNT',
      text: 'Number of containers collected',
      type: 'Number',
      required: true,
      tags: ['CONT_COUNT', 'Number', 'Required', 'Collection Details'],
    },
    {
      id: 'Q4_COMP_DATE',
      text: 'Service completion date',
      type: 'Date',
      required: true,
      tags: ['COMP_DATE', 'Date', 'Required', 'Collection Details'],
    },
    {
      id: 'Q5_ADD_NOTES',
      text: 'Additional notes or observations',
      description: 'Record any unusual conditions or important observations',
      type: 'Text',
      required: false,
      tags: ['ADD_NOTES', 'Text', 'Collection Details'],
    },
  ],
  created: '11/14/2024',
  createdBy: 'Sarah Johnson',
  lastModified: '12/19/2024',
  lastModifiedBy: 'Mike Chen',
};

