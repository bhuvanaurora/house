angular.module('MyApp')
  .controller('DetailCtrl', ['$scope', '$rootScope', '$routeParams', 'House', 'Subscription', 'Session', 'Auth', 'Profile',
    function($scope, $rootScope, $routeParams, House, Subscription, Session, Auth, Profile) {

    $scope.sessionCity = '';

    $scope.session = Session;

    $scope.session.success(function(data) {
      $scope.sessionCity = data.city;
      if (data.session == 'expired') {
        Auth.logout();
      }
    });

    House.get({ _id: $routeParams.id }, function (house) {
      $scope.house = house;
      //console.log($scope.house.owner[0]);

      if ($scope.house.owner == '' || $scope.house.owner == []) {

        $scope.owner.name = "Unknown";
        $scope.selectedPicture = house.pictures[0];

          $scope.changePicture = function (picture) {
            $scope.selectedPicture = picture;
          }

      } else {

        Profile.get({ id: $scope.house.owner }, function(owner) {
          $scope.owner = owner;

          console.log($scope.owner);

          $scope.selectedPicture = house.pictures[0];

          $scope.changePicture = function (picture) {
            $scope.selectedPicture = picture;
          }

        });

      }
      
    });

      /*Show.get({ _id: $routeParams.id }, function(show) {
        $scope.show = show;

        $scope.isSubscribed = function() {
          return $scope.show.subscribers.indexOf($rootScope.currentUser._id) !== -1;
        };

        $scope.subscribe = function() {
          Subscription.subscribe(show).success(function() {
            $scope.show.subscribers.push($rootScope.currentUser._id);
          });
        };

        $scope.unsubscribe = function() {
          Subscription.unsubscribe(show).success(function() {
            var index = $scope.show.subscribers.indexOf($rootScope.currentUser._id);
            $scope.show.subscribers.splice(index, 1);
          });
        };

        $scope.nextEpisode = show.episodes.filter(function(episode) {
          return new Date(episode.firstAired) > new Date();
        })[0];
      });*/
    }]);