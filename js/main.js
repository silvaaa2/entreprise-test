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

// rendre accessibles au HTML (onclick)
window.login = login;
window.loginWithGoogle = loginWithGoogle;
window.resetPassword = resetPassword;
window.logout = logout;
window.showSection = showSection;
window.toggleTheme = toggleTheme;

// init
initAuthListener();
initTheme();
