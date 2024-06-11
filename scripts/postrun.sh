#!/bin/bash

unique_name=${1//[^[:alnum:]_]/}
rm -rf "$unique_name"