// Express-validator helper: runs the validation chain and returns 400 if any
// check failed. Use it after the validation chain inside route definitions.
//
//   router.post('/foo',
//     body('name').isString().trim().notEmpty(),
//     validate,
//     handler);
//
const { validationResult } = require('express-validator');

module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({ error: 'validation_failed', details: errors.array() });
};
