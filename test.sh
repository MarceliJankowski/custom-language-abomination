#!/bin/bash

# test interpreter on code-examples

# VARIABLES:
readonly SCRIPT_NAME=$(basename $0)
readonly CODE_EXAMPLES_DIR='./codeExamples'
readonly CODE_EXAMPLES=$(ls "$CODE_EXAMPLES_DIR")

# check if CODE_EXAMPLES_DIR exists
if [[ ! -d "$CODE_EXAMPLES_DIR" ]]; then
	echo -e "\ncodeExamples directory was not found, path: ${CODE_EXAMPLES_DIR}"
	exit 1
fi

# execute CODE_EXAMPLES one by one
echo "$CODE_EXAMPLES" | xargs -I {} npm run start -- -f "$CODE_EXAMPLES_DIR/{}" 1>/dev/null

# if code-example execution fails, 'test' fails
if [[ "$?" -ne 0 ]]; then
	echo -e "\n$SCRIPT_NAME has failed"
	exit 1
fi

exit 0
