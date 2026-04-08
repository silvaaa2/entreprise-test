import {
  login,
  loginWithGoogle,
  resetPassword,
  logout,
  initAuthListener
} from "./auth.js";

import {
  showSection,
  toggleTheme,
  initTheme
} from "./dashboard.js";

import {
  createNewUser,
  fetchUsers,
  updateUserRole,
  deleteUser,
  openUserProfile,
  closeUserProfile
} from "./users.js";

import {
  submitRequest,
  fetchRequests,
  updateRequest
} from "./requests.js";

import {
  populateSanctionDropdown,
  submitSanction,
  fetchSanctions,
  deleteSanction
} from "./sanctions.js";

// ==================== AUTH ====================
window.login = login;
window.loginWithGoogle = loginWithGoogle;
window.resetPassword = resetPassword;
window.logout = logout;

// ==================== DASHBOARD ====================
window.showSection = showSection;
window.toggleTheme = toggleTheme;

// ==================== USERS ====================
window.createNewUser = createNewUser;
window.fetchUsers = fetchUsers;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.openUserProfile = openUserProfile;
window.closeUserProfile = closeUserProfile;

// ==================== REQUESTS ====================
window.submitRequest = submitRequest;
window.fetchRequests = fetchRequests;
window.updateRequest = updateRequest;

// ==================== SANCTIONS ====================
window.populateSanctionDropdown = populateSanctionDropdown;
window.submitSanction = submitSanction;
window.fetchSanctions = fetchSanctions;
window.deleteSanction = deleteSanction;

// ==================== INIT ====================
initTheme();
initAuthListener();
