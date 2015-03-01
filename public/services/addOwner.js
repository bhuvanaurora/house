angular.module('MyApp')
  .factory('Owner', function($resource) {
    return $resource('/api/addOwner');
  });