angular.module('MyApp')
  .factory('House', function($resource) {
    return $resource('/api/houses/:_id');
  });