angular.module('MyApp')
  .controller('MainCtrl', ['$scope', 'House',
    function($scope, House) {

    $scope.alphabet = ['0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
      'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
      'Y', 'Z'];

    $scope.locations = ['Koramangala', 'Indiranagar', 'MG Road', 'Whitefield',
                        'Marathahalli', 'Electronic City', 'HSR Layout',
                        'Hebbal', 'Domlur', 'RT Nagar'];

    $scope.headingTitle = 'Top houses available';
    $scope.houses = House.query();

    $scope.filterByLocation = function(location) {
      $scope.houses = House.query({ neighborhood: location });
      $scope.headingTitle = location;
    };

    $scope.filterByAlphabet = function(char) {
      $scope.houses = House.query({ alphabet: char });
      $scope.headingTitle = char;
    };

  }]);