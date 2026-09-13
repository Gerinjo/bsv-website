# tFPDF

Vendored runtime subset of Setasign/tFPDF v1.33, commit
`050de12ab5359ce475dab49bae5cedbcf455f708`:
https://github.com/Setasign/tFPDF/tree/050de12ab5359ce475dab49bae5cedbcf455f708

The PHP library files are unmodified. `membership-pdf.php` explicitly loads
`ttfonts.php` instead of using Composer. Only the two required DejaVu Sans
fonts are included. Library licensing is documented in `README.txt` and the
source headers; the font license is in `font/unifont/DejaVu_LICENSE.txt`.

Runtime requirements: PHP 7.3+, mbstring and zlib. Optional generated font
metrics may be cached alongside the fonts; these contain no application data.
