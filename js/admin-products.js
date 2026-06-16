async function init() {
  await AdminAuth.requireAuth();
  await BlogCore.initAdmin();
  AdminAuth.bindLogout();
  AdminCore.renderAdminProductList();
  AdminCore.bindProductAdmin(AdminCore.renderAdminProductList);
  document.addEventListener('i18n:changed', AdminCore.renderAdminProductList);
}

init();