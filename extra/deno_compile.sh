#!/usr/bin/env -S bash
# deno_compile.sh
# compile a deno script only if its changed agaionst the version in ./dist
# include the standard library functions, which should be in an include dir under
# the directory this script is stored in
SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
if [ ! -f "$SOURCE_DIR/include/script_base" ]; then
  SOURCE_DIR="$HOME/bin"
fi
# shellcheck disable=SC1090
. "$SOURCE_DIR/include/script_base" 2> /dev/null

COMPILE_FLAGS="-RWES --unstable-detect-cjs"
FORCE="0"
RUN_PROGS=""

# ---------------------------------------------------------------------------
# setup HELP for show_usage

set_help "$PROGRAM <options> [deno script]
compile a deno script only if its changed against the version in ./dist
    usage:  [-h]

    -h | --help      This help
    -f | --flags <flags>    Compile flags, default:'$COMPILE_FLAGS'
    -r | --run       Allow subprograms to be run by the script
    --force          Force compile, even if target is newer
    -v | --verbose   verbose debug output"

# ---------------------------------------------------------------------------
# clean up things whenever the script completes
# if not using, comment it out
# cleanup() {
#     echo ""
# }
# trap cleanup EXIT

# ---------------------------------------------------------------------------
# process command line args

# http://stackoverflow.com/questions/402377/using-getopts-in-bash-shell-script-to-get-long-and-short-command-line-options#402410
# NOTE: This requires GNU getopt.
# need to mention both short (-o) and long (--options) here
# trailing : shows a parameter is required
# options should pick the right tool depending on OS
TEMP=$(options -o vhf:r --long verbose,help,flags:,force,run -n "$PROGRAM" -- "$@" 2>/dev/null)

# if any parameters were bad
if [ $? != 0 ] ; then show_usage 'Bad Parameters' ; fi

# Note the quotes around '$TEMP': they are essential!
eval set -- "$TEMP"

while true; do
    case "$1" in
    -v | --verbose ) set_verbose 1
    ;;
    -h | --help ) show_usage ''
    ;;
    -f | --flags)
      COMPILE_FLAGS="$2"
      # remove param and data
      shift
      if ! [[ $COMPILE_FLAGS =~ ^- ]] ; then
        COMPILE_FLAGS="-$COMPILE_FLAGS"
        debug "prefixing compile files to be: $COMPILE_FLAGS"
      fi
    ;;
    --force)
      FORCE="1"
    ;;
    -r|--run)
      RUN_PROGS="--allow-run"
    ;;
    * ) break ;;
    esac
    shift
done
# tidy up command line
shift

# ---------------------------------------------------------------------------
#  now start the main program
log_debug "started"
SOURCE=${1:-}

if [[ "$SOURCE" == "" ]] || [[ ! -f "$SOURCE" ]] ; then
  show_usage "Error: You need to pass a typescript/deno file" 1
fi

TARGET="./dist/"$(basename "$SOURCE" '.ts')

if [[ ! -d "./dist" ]] || [[ ! -f "$TARGET" ]] || [[ "$SOURCE" -nt "$TARGET" ]]  || [[ "$FORCE" = "1"  ]]; then
  cmd="deno compile $COMPILE_FLAGS $RUN_PROGS -o $TARGET $SOURCE"
  log_debug "running: $cmd"
  $cmd
  # deno compile "$COMPILE_FLAGS" -o "$TARGET" $RUN_PROGS "$SOURCE"
else
  log_debug "$TARGET is more recent than $SOURCE"
fi
