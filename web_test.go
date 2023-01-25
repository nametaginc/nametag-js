// Copyright 2022 Nametag Inc.
//
// All information contained herein is the property of Nametag Inc.. The
// intellectual and technical concepts contained herein are proprietary, trade
// secrets, and/or confidential to Nametag, Inc. and may be covered by U.S.
// and Foreign Patents, patents in process, and are protected by trade secret or
// copyright law. Reproduction or distribution, in whole or in part, is
// forbidden except by express written permission of Nametag, Inc.

package nametagjs

import (
	"os"
	"os/exec"
	"testing"

	"gotest.tools/assert"

	_ "github.com/nametaginc/nt/pkg/expect" // for command line option
)

// TestCompiles checks that the app at least compiles successfully
func TestCompiles(t *testing.T) {
	cmd := exec.Command("yarn", "install")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	assert.Check(t, cmd.Run())

	cmd = exec.Command("yarn", "build")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	assert.Check(t, cmd.Run())
}
