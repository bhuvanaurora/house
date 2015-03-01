angular.module('MyApp')
  .controller('AddOwnerCtrl', ['$scope', '$alert', '$window', '$upload', '$routeParams', '$rootScope', '$location', '$route', 'House', 'Profile', 'Session', 'Auth', 'Owner',
    function($scope, $alert, $window, $upload, $routeParams, $rootScope, $location, $route, House, Profile, Session, Auth, Owner) {

    $scope.sessionCity = '';

    $scope.session = Session;

    $scope.session.success(function(data) {
      $scope.sessionCity = data.city;
      if (data.session == 'expired') {
        Auth.logout();
      }
    });

    var picture = '';
    $scope.onFileSelect = function ($files) {
        for (var i = 0; i < $files.length; i++) {
            var file = $files[i];
            $scope.upload = $upload.upload({
                url: '/uploadProfilePic',
                data: {myObj: $scope.myModelObj},
                file: file,
            }).progress(function (evt) {
                console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
            }).success(function (data, status, headers, config) {
                picture = data.imageurl;
            });
        }
    };

    $scope.addOwner = function () {
      Owner.save({
        name: $scope.name,
        pic: picture,
        isActive: false
      }, function (owner) {
        console.log('Owner added');
        $window.location = 'addHouse/'+owner._id;
      }, function (response) {
        $alert({
              content: response.data.message,
              placement: 'top-right',
              type: 'material',
              duration: 3
          });
      });
    }

  }]);