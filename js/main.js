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

// ==================== AUTH ====================
window.login = login;
window.loginWithGoogle = loginWithGoogle;
window.resetPassword = resetPassword;
window.logout = logout;

// ==================== DASHBOARD / UI ====================
window.showSection = showSection;
window.toggleTheme = toggleTheme;

// ==================== USERS ====================
window.createNewUser = createNewUser;
window.fetchUsers = fetchUsers;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.openUserProfile = openUserProfile;
window.closeUserProfile = closeUserProfile;

// ==================== INIT ====================
initTheme();
initAuthListener();
