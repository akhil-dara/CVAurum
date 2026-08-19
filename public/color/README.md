# Colour profiles

`sRGB2014.icc` — the sRGB v2 ICC profile published by the International Color
Consortium at <https://registry.color.org/rgb-registry/srgbprofiles>.

It is embedded in every exported PDF as the PDF/A OutputIntent's destination
profile, which is what lets an archival reader reproduce the document's
colours years from now. Served from our own origin, like the fonts, so an
export still makes zero external requests.

Redistributed unmodified under the ICC's own terms: permission to use, copy
and distribute the file for any purpose is granted without fee, provided the
file is not modified and the ICC copyright notice inside it is preserved.
