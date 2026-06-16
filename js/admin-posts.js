async function init() {
  await AdminAuth.requireAuth();
  await BlogCore.initAdmin();
  AdminAuth.bindLogout();
  AdminCore.renderAdminPostList();
  AdminCore.bindPostAdmin(AdminCore.renderAdminPostList);
  AdminCore.bindCommentsAdmin();
  document.addEventListener('i18n:changed', AdminCore.renderAdminPostList);
}

init();