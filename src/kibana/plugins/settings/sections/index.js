define(function (require) {
  // each of these private modules returns an object defining that section, their properties
  // are used to create the nav bar
  return [
    require('plugins/settings/sections/indices/index'),
    require('plugins/sindicetech/queries_editor/index'),   // added by sindicetech
    require('plugins/sindicetech/templates_editor/index'), // added by sindicetech
    require('plugins/sindicetech/dashboard_groups_editor/index'), // added by sindicetech
    require('plugins/settings/sections/advanced/index'),
    require('plugins/settings/sections/objects/index'),
    require('plugins/settings/sections/about/index')
  ];
});