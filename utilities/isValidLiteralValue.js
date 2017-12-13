'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValidLiteralValue = isValidLiteralValue;

var _printer = require('../language/printer');

var _kinds = require('../language/kinds');

var Kind = _interopRequireWildcard(_kinds);

var _definition = require('../type/definition');

var _isInvalid = require('../jsutils/isInvalid');

var _isInvalid2 = _interopRequireDefault(_isInvalid);

var _keyMap = require('../jsutils/keyMap');

var _keyMap2 = _interopRequireDefault(_keyMap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

/**
 * Utility for validators which determines if a value literal node is valid
 * given an input type.
 *
 * Note that this only validates literal values, variables are assumed to
 * provide values of the correct type.
 */
function isValidLiteralValue(type, valueNode) {
  // A value must be provided if the type is non-null.
  if ((0, _definition.isNonNullType)(type)) {
    if (!valueNode || valueNode.kind === Kind.NULL) {
      return ['Expected "' + String(type) + '", found null.'];
    }
    return isValidLiteralValue(type.ofType, valueNode);
  }

  if (!valueNode || valueNode.kind === Kind.NULL) {
    return [];
  }

  // This function only tests literals, and assumes variables will provide
  // values of the correct type.
  if (valueNode.kind === Kind.VARIABLE) {
    return [];
  }

  // Lists accept a non-list value as a list of one.
  if ((0, _definition.isListType)(type)) {
    var itemType = type.ofType;
    if (valueNode.kind === Kind.LIST) {
      return valueNode.values.reduce(function (acc, item, index) {
        var errors = isValidLiteralValue(itemType, item);
        return acc.concat(errors.map(function (error) {
          return 'In element #' + index + ': ' + error;
        }));
      }, []);
    }
    return isValidLiteralValue(itemType, valueNode);
  }

  // Input objects check each defined field and look for undefined fields.
  if ((0, _definition.isInputObjectType)(type)) {
    if (valueNode.kind !== Kind.OBJECT) {
      return ['Expected "' + type.name + '", found not an object.'];
    }
    var fields = type.getFields();

    var errors = [];

    // Ensure every provided field is defined.
    var fieldNodes = valueNode.fields;
    fieldNodes.forEach(function (providedFieldNode) {
      if (!fields[providedFieldNode.name.value]) {
        errors.push('In field "' + providedFieldNode.name.value + '": Unknown field.');
      }
    });

    // Ensure every defined field is valid.
    var fieldNodeMap = (0, _keyMap2.default)(fieldNodes, function (fieldNode) {
      return fieldNode.name.value;
    });
    Object.keys(fields).forEach(function (fieldName) {
      var result = isValidLiteralValue(fields[fieldName].type, fieldNodeMap[fieldName] && fieldNodeMap[fieldName].value);
      errors.push.apply(errors, result.map(function (error) {
        return 'In field "' + fieldName + '": ' + error;
      }));
    });

    return errors;
  }

  if ((0, _definition.isEnumType)(type)) {
    if (valueNode.kind !== Kind.ENUM || !type.getValue(valueNode.value)) {
      return ['Expected type "' + type.name + '", found ' + (0, _printer.print)(valueNode) + '.'];
    }

    return [];
  }

  if ((0, _definition.isScalarType)(type)) {
    // Scalars determine if a literal value is valid via parseLiteral().
    try {
      var parseResult = type.parseLiteral(valueNode, null);
      if ((0, _isInvalid2.default)(parseResult)) {
        return ['Expected type "' + type.name + '", found ' + (0, _printer.print)(valueNode) + '.'];
      }
    } catch (error) {
      var printed = (0, _printer.print)(valueNode);
      var message = error.message;
      return ['Expected type "' + type.name + '", found ' + printed + '; ' + message];
    }

    return [];
  }

  /* istanbul ignore next */
  throw new Error('Unknown type: ' + type + '.');
} /**
   * Copyright (c) 2015-present, Facebook, Inc.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *
   * 
   */