angular.module('MyApp')
  .factory('Profile', function($resource) {
    return $resource('/api/profile/:id');
  });