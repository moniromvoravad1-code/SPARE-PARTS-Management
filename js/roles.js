/**
 * js/roles.js - Role-based access control
 */

const ROLES = {
  manager: {
    label: 'Manager',
    pages: ['home', 'parts', 'tools', 'cal', 'war', 'po', 'log', 'admin'],
    can: {
      edit: 1, issue: 1, receive: 1, adjust: 1, checkout: 1, po: 1,
      poApprove: 1, cal: 1, admin: 1, creds: 1, del: 1, export: 1
    }
  },
  storekeeper: {
    label: 'Storekeeper',
    pages: ['home', 'parts', 'tools', 'cal', 'war', 'po', 'admin'],
    can: {
      edit: 1, issue: 1, receive: 1, adjust: 1, checkout: 1, po: 1,
      poApprove: 0, cal: 1, admin: 0, creds: 0, del: 0, export: 0
    }
  },
  tech: {
    label: 'Technician',
    pages: ['home', 'parts', 'tools', 'cal', 'war', 'po'],
    can: {
      edit: 0, issue: 1, receive: 0, adjust: 0, checkout: 1, po: 0,
      poApprove: 0, cal: 0, admin: 0, creds: 0, del: 0, export: 0
    }
  },
  guest: {
    label: 'Guest',
    pages: ['home', 'parts', 'tools', 'cal', 'war'],
    can: {
      edit: 0, issue: 0, receive: 0, adjust: 0, checkout: 0, po: 0,
      poApprove: 0, cal: 0, admin: 0, creds: 0, del: 0, export: 0
    }
  }
};

// Check if current user can perform action
const can = (k) => !!(VIEW.user && ROLES[VIEW.user.role] && ROLES[VIEW.user.role].can[k]);

// Check if user can see page
const canSee = (page) => VIEW.user && ROLES[VIEW.user.role].pages.includes(page);
