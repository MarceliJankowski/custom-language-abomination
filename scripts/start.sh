#!/bin/bash

# VARIABLES
readonly SCRIPT_NAME=$(basename $0)
readonly DIST_DIR="$(dirname $(dirname $0))/dist"

# CODE

if [[ ! -d "$DIST_DIR" ]]; then
	echo "$SCRIPT_NAME - '${DIST_DIR}' directory doesn't exist, running build-script..."

	npm run build

	# handle build-script failure
	if [[ "$?" -ne 0 ]]; then
		echo "build-script failed" 1>&2
		exit 1
	fi

	echo
	echo "$SCRIPT_NAME - build-script succeeded, running basic-interpreter..."
fi

# run basic-interpreter
echo
node "${DIST_DIR}/main.js" $@
