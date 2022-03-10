#!/bin/bash
# Copyright 2022 Nametag Inc.
#
# Use of this source code is governed by a BSD-style
# license that can be found in the LICENSE file or at
# https://developers.google.com/open-source/licenses/bsd

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
