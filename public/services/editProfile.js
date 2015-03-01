angular.module('MyApp')
  .factory('editProfile', function($http) {
    return {
    	updateHouseOwned: function(id, houseOwned) {
    		return $http.put('/api/editprofile', { id: id, houseOwned: houseOwned });
    	}
  }
});