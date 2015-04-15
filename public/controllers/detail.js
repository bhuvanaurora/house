angular.module('MyApp')
  .controller('DetailCtrl', ['$scope', '$rootScope', '$window', '$routeParams', 'House', 'Subscription', 'Session', 'Auth', 'Profile',
    function($scope, $rootScope, $window, $routeParams, House, Subscription, Session, Auth, Profile) {

    $scope.sessionCity = '';

    $scope.session = Session;

    $scope.session.success(function(data) {
      $scope.sessionCity = data.city;
      if (data.session == 'expired') {
	$window.fbAsyncInit  = function() {
	  FB.init({
	    appId: '809113722498335',
	    responseType: 'token',
	    version: 'v2.3',
	    oauth: true,
	    xfbml: true
	  });
	}
        Auth.logout();
      }
    });

    $window.fbAsyncInit = function() {
      FB.init({
	appId: '809113722498335',
	responseType: 'token',
	version: 'v2.3',
	oauth: true,
	xfbml: true
      })
    }

	$scope.fb_share = function() {console.log('button pressed');}

    House.get({ _id: $routeParams.id }, function (house) {
      $scope.house = house;

      $scope.fb_share = function() {
	FB.ui({
	  method: 'feed',
	  name: house.details.size+" sq.ft. "+house.details.BHK+" "+house.details.propType+" available for rent in "+house.address.neighborhood,
	  link: "http://localhost:3000/"+house._id,
	  picture: "https://s3-ap-southeast-1.amazonaws.com/house-image/"+house.pictures.link[0],
	  description: "Rent: INR "+house.cost.rent+" Security deposit: INR "+house.cost.secDeposit
	});
      };

      if ($scope.house.owner == '' || $scope.house.owner == []) {

        $scope.owner.name = "Unknown";
        $scope.selectedPicture = house.pictures.link[0];

        $scope.changePicture = function (picture) {
          $scope.selectedPicture = picture;
        }

      } else {

        Profile.get({ id: $scope.house.owner }, function(owner) {
          $scope.owner = owner;

          $scope.selectedPicture = house.pictures.link[0];

          $scope.changePicture = function (picture) {
            $scope.selectedPicture = picture;
          }

        });

      }
      
    });

// ---------------------- Google Maps ----------------------- //

    var map;
    (function () {
      var mapZoom = 12;
      var mapOptions = {
        zoom: mapZoom,
	center: new google.maps.LatLng(12.9539, 77.6309),
	mapTypeControl: false,
	panControl: false,
	zoomControl: true,
	streetViewControl: true,
	mapTypeId: google.maps.MapTypeId.ROADMAP,
	scrollwheel: true
      };
	
      map = new google.maps.Map(document.getElementById('google-maps-container'), mapOptions);

      var marker = new google.maps.Marker({
	position: new google.maps.LatLng(12.9539, 77.6309),
        map: map,
	//title: house.address.house,
	animation: google.maps.Animation.DROP,
	visible: true
      });
    
      function toggleBounce() {
	if (marker.getAnimation != null) {marker.setAnimation(null);}
	else {marker.setAnimation(google.maps.Animation.BOUNCE);}
      };
 
      google.maps.event.addListener(marker, 'click', toggleBounce); 
    }());
    google.maps.event.addDomListener(window, 'load');

    }]);
