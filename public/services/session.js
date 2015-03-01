angular.module('MyApp')
    .factory('Session', function($http) {
        return $http.post('/api/session');
    });