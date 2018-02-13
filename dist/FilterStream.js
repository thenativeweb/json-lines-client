'use strict';

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('stream'),
    Transform = _require.Transform;

var FilterStream = function (_Transform) {
  (0, _inherits3.default)(FilterStream, _Transform);

  function FilterStream(predicate) {
    (0, _classCallCheck3.default)(this, FilterStream);

    var _this = (0, _possibleConstructorReturn3.default)(this, (FilterStream.__proto__ || (0, _getPrototypeOf2.default)(FilterStream)).call(this, { objectMode: true }));

    _this.predicate = predicate;
    return _this;
  }

  (0, _createClass3.default)(FilterStream, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      if (this.predicate(chunk)) {
        this.push(chunk);
      }

      callback();
    }
  }]);
  return FilterStream;
}(Transform);

module.exports = FilterStream;