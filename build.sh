#!/bin/bash
# Copyright 2022 Nametag Inc.
#
# All information contained herein is the property of Nametag Inc.. The
# intellectual and technical concepts contained herein are proprietary, trade
# secrets, and/or confidential to Nametag, Inc. and may be covered by U.S.
# and Foreign Patents, patents in process, and are protected by trade secret or
# copyright law. Reproduction or distribution, in whole or in part, is
# forbidden except by express written permission of Nametag, Inc.

set -o pipefail
set -e

(
	echo '// automatically generated, do not edit'
	echo 'export const styles = `'
	cat src/button.css
	cat src/popup.css
	echo '`'
) >src/styles.ts

tsc --declaration
