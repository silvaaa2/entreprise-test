import { login, loginWithGoogle, resetPassword, logout, initAuthListener } from "./auth.js";
import { showSection } from "./ui.js";

window.login = login;
window.loginWithGoogle = loginWithGoogle;
window.resetPassword = resetPassword;
window.logout = logout;
window.showSection = showSection;

initAuthListener();
