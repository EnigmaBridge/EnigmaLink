#!/bin/bash
COMBINED="enigma.combined.js"

echo -n '' > $COMBINED
cat sjcl.js >> $COMBINED
cat sprintf.js >> $COMBINED
cat enigma.js >> $COMBINED
