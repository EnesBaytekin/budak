package web

import "embed"

// FrontendDist holds the built frontend static files.
// Populated by: cp -r ../../frontend/dist ./dist  (run from backend/)
// or via build.sh / CI pipeline.
//
//go:embed dist
var FrontendDist embed.FS
