#!/bin/bash

# runs tests to make sure that CLA works as expected

# VARIABLES
readonly SCRIPT_INTERNAL_ERROR=255
readonly SCRIPT_NAME=$(basename $0)
readonly DIST_DIR="$(dirname $(dirname $0))/dist"
readonly TESTS_DIR="./tests"
readonly TESTS=$(ls "$TESTS_DIR" --ignore='info') # exclude 'info' from tests

# UTILITIES
# Hmm, for such small script I may have gone a little overboard with these utilities

# prepends 'message' with SCRIPT_NAME (for output readability purposes), and logs it to std output
log() {
	[[ $# -ne 1 ]] && throwInternalErr "log utility requires 1 argument (message), while $# arguments were passed"

	local readonly MESSAGE="$1"

	echo -e "$SCRIPT_NAME - $MESSAGE"

	return 0
}

# prepends 'message' with SCRIPT_NAME (for output readability purposes), and logs it to std error
logErr() {
	[[ $# -ne 1 ]] && throwInternalErr "logErr utility expects 1 argument (message), while $# arguments were passed"

	local readonly MESSAGE="$1"

	echo -e "$SCRIPT_NAME - $MESSAGE" 1>&2

	return 0
}

# throws internal error, expects 'message' argument
throwInternalErr() {
	local MESSAGE="$1"

	[[ $# -ne 1 ]] && MESSAGE="throwInternalErr utility expects 1 argument (message), while $# arguments were passed"

	echo -e "$SCRIPT_NAME - INTERNAL ERROR\n$MESSAGE" 1>&2

	exit $SCRIPT_INTERNAL_ERROR
}

# "throws exception" by logging 'message' to std error and exiting with 'exitCode'
throwErr() {
	[[ $# -ne 2 ]] && throwInternalErr "throwErr utility expects 2 arguments (message and exitCode), while $# arguments were passed"

	local readonly MESSAGE="$1"
	local readonly EXIT_CODE="$2"

	logErr "$MESSAGE"

	exit $EXIT_CODE
}

# CODE

# make sure that TESTS_DIR exists
[[ ! -d "$TESTS_DIR" ]] && throwErr "'${TESTS_DIR}' directory was not found" 2

# handle DIST_DIR
log "rebuilding CLA interpreter to make sure that '${DIST_DIR}' contains all the latest changes"
npm run build 1>/dev/null

[[ "$?" -ne 0 ]] && exit 3

# sort TESTS
# due to some tests having precedence over others (like exception handling being tested before CLA API to prevent misleading errors) sorting step is required
echo
log "sorting tests by their index..."
readonly SORTED_TESTS=$(echo "$TESTS" | sort -n)

# execute SORTED_TESTS one by one
log "running tests..."

for TEST in $SORTED_TESTS; do
	# run test
	TEST_ERRORS=$(npm start -- -f "${TESTS_DIR}/${TEST}" 2>&1 1>/dev/null)
	TEST_EXIT_CODE="$?"

	# assert test exit code
	if [[ "$TEST_EXIT_CODE" -ne 0 ]]; then

		echo
		logErr "TEST FAILURE"
		logErr "TEST FILE: '${TESTS_DIR}/${TEST}'"
		logErr "EXIT CODE: $TEST_EXIT_CODE"

		if [[ -n "$TEST_ERRORS" ]]; then
			logErr "ERROR LOG:\n"
			echo "$TEST_ERRORS" 1>&2
		else
			logErr "NO ERROR LOG"
		fi

		echo
		exit 1
	fi
done

# all tests passed
echo
log "SUCCESS"
log "All tests passed (:"
echo

exit 0
