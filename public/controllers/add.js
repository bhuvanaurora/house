angular.module('MyApp')
  .controller('AddCtrl', ['$scope', '$alert', '$upload', '$routeParams', '$location', 'House', 'Profile', 'Session', 'Auth',
    function($scope, $alert, $upload, $routeParams, $location, House, Profile, Session, Auth) {

    $scope.sessionCity = '';

    $scope.session = Session;

    $scope.session.success(function(data) {
      $scope.sessionCity = data.city;
      if (data.session == 'expired') {
        Auth.logout();
      }
    });

    Profile.get({ _id: $routeParams.id }, function (profile) {
        $scope.profile = profile;
    
        // -------------- Default values --------------- //

        $scope.city = 'Bangalore';
        $scope.status = 'up_for_grabs';
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
          console.log(id);
          House.save({ 
            id: id,
            city: $scope.city,
            neighborhood: $scope.neighborhood,
            amenities: $scope.selectedAmenities,
            pictures: poster,
            address: $scope.address,
            status: $scope.status,
            addedBy: profile 
          }, function () {
            console.log('House added');
            $location.path('/{{$scope.sessionCity}}');
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
      formElements = document.getElementsByClassName('form-control');
      owner = document.getElementById('owner');
      for (var i=0; i<formElements.length; i++) {
        formElements[i].disabled = false;
      }
      owner.hidden = true;
    };


  }]);