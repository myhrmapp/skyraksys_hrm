const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  layout: {
    drawerToggle:       tid('layout-drawer-toggle'),
    roleChip:           tid('layout-role-chip'),
    notificationsButton:tid('layout-notifications-button'),
    profileMenuTrigger: tid('layout-profile-menu-trigger'),
    menuViewProfile:    tid('layout-menu-view-profile'),
    menuSettings:       tid('layout-menu-settings'),
    menuLogout:         tid('layout-menu-logout'),
    navItem: (path) =>  tid(`nav-${path}`),
  }
};
