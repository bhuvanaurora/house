angular.module('MyApp')
  .controller('AddCtrl', ['$scope', '$alert', '$window', '$upload', '$routeParams', '$rootScope', '$location', 'House', 'editProfile', 'Session', 'Auth', 'Owner', 'Profile',
    function($scope, $alert, $window, $upload, $routeParams, $rootScope, $location, House, editProfile, Session, Auth, Owner, Profile) {

    $scope.sessionCity = '';

    $scope.session = Session;

    if ($routeParams.id) {
      formElements = document.getElementsByClassName('form-control');
        if (document.getElementById('owner')) {
          ownerEle = document.getElementById('owner');
          ownerEle.hidden = true;
        }
        for (var i=0; i<formElements.length; i++) {
          formElements[i].disabled = false;
        }
    }

    $scope.session.success(function(data) {
      $scope.sessionCity = data.city;
      if (data.session == 'expired') {
        Auth.logout();
      }
    });

    Profile.get({ id: $rootScope.currentUser._id }, function (profile) {
        $scope.profile = profile;
    
        // -------------- Default values --------------- //

        $scope.city = 'Bangalore';
        $scope.status = 'up for grabs';
        $scope.amenities = ['Pool', 'Gym', 'Elevator', 'Parking', 'Power Backup', 'Club'];
        $scope.selectedAmenities = [];
        $scope.locations = ['Koramangala', 'Indiranagar', 'MG Road', 'Whitefield',
                        'Marathahalli', 'Electronic City', 
                        'HSR Layout', 'Hebbal', 'Domlur', 'RT Nagar'];

        $scope.addAmenity = function(amenity) {
          $scope.selectedAmenities.push(amenity);
          $scope.amenities.splice($scope.amenities.indexOf(amenity), 1);
        };

        $scope.removeAmenity = function(amenity) {
          $scope.amenities.push(amenity);
          $scope.selectedAmenities.splice($scope.selectedAmenities.indexOf(amenity), 1);
        };

        var poster = [];
        $scope.onFileSelect = function ($files) {
            for (var i = 0; i < $files.length; i++) {
                var file = $files[i];
                $scope.upload = $upload.upload({
                    url: '/upload',
                    data: {myObj: $scope.myModelObj},
                    file: file,
                }).progress(function (evt) {
                    console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
                }).success(function (data, status, headers, config) {
                    poster.push(data.imageurl);
                });
            }
        };

        $scope.addHouse = function () {
          var id;
          var add = $scope.address.split(" ");
          id = add.join("-");
          House.save({ 
            id: id,
            city: $scope.city,
            neighborhood: $scope.neighborhood,
            amenities: $scope.selectedAmenities,
            pictures: poster,
            address: $scope.address,
            status: $scope.status,
            addedBy: $scope.profile._id,
            owner: $routeParams.id
          }, function (house) {
            console.log('House added');

            if ($scope.profile._id == $routeParams.id){

              // ----------- houseOwned not being updated in the users' profile ------------- //

              editProfile.updateHouseOwned($scope.profile._id, house._id).success(function () {
              });
              $window.location = '/'+$scope.sessionCity;
             
            } else {

              editProfile.updateHouseOwned($routeParams.id, house._id).success(function () {
              });
              $window.location = '/'+$scope.sessionCity;
            }

          }, function (response) {
              $alert({
                  content: response.data.message,
                  placement: 'top-right',
                  type: 'material',
                  duration: 3
              });
          });
        };

    });
    
    $scope.enableForm = function () {
      $window.location = '/addHouse/'+$rootScope.currentUser._id;
    };

    $scope.addOwner = function () {
      $location.path('/addOwner');
    }


  }]);