# otinfo
JavaScript OpenType Font Information Library


Live demo: https://mattmatic.github.io/otinfo/


Based on https://github.com/danbovey/fontname
- Added support for other OpenType tables and data.
- Added extendable parsing support for new tables
 - without the need to edit the original JS).
 - Create `OTInfo.TABLE = {}` and `OTInfo.TABLE.parse = function(data, offset, length, tables)` (see `otinfo.js` for template)

