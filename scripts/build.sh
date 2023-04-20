#!/bin/bash

# VARIABLES
readonly SCRIPT_NAME=$(basename $0)
readonly DIST_DIR="$(dirname $(dirname $0))/dist"
readonly BUILD_TOOL=tsc

# CODE

log() {
	echo -e "$SCRIPT_NAME - $1"
	return 0
}

# HANDLING DIST_DIR

if [[ -d "$DIST_DIR" ]]; then
	log "'${DIST_DIR}' directory already exists"
	log "removing it to rebuild project in case any changes took place"

	rm $DIST_DIR -r

	if [[ "$?" -ne 0 ]]; then
		log "$DIST_DIR removing process failed" 1>&2
		exit 1
	fi

	log "successfully removed '${DIST_DIR}' directory"
	echo
fi

# BUILDING PROJECT

log "building project / transpiling TypeScript..."

$($BUILD_TOOL 1>/dev/null)

if [[ "$?" -ne 0 ]]; then
	log "building process failed" 1>&2
	exit 2
fi

log "building process succeeded, '${DIST_DIR}' directory was created and populated"
