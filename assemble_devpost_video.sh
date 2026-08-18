#!/usr/bin/env bash
set -euo pipefail
ROOT=/home/ubuntu/gemini-ops-fleet-dashboard
OUT=$ROOT/docs/gemini-ops-fleet-devpost-demo-ko.mp4
TMP=$ROOT/docs/video_segments
OV=/home/ubuntu/screenshots/webdev-preview-root-1787091336665349236-5502.png
AD=/home/ubuntu/screenshots/webdev-preview-root-1787091336782140315-3667.png
FONT=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc
mkdir -p "$TMP"
rm -f "$TMP"/*.mp4 "$TMP/concat.txt" "$OUT"
make_segment() {
  local n="$1" duration="$2" image="$3" title="$4"
  ffmpeg -y -loglevel error -loop 1 -i "$image" -t "$duration" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,drawbox=x=0:y=0:w=1280:h=82:color=0x102b2b@0.88:t=fill,drawtext=fontfile=$FONT:text='$title':fontcolor=white:fontsize=27:x=42:y=26,fade=t=in:st=0:d=0.35,fade=t=out:st=$(awk "BEGIN {print $duration-0.35}"):d=0.35" \
    -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$TMP/segment-$n.mp4"
  printf "file '%s'\n" "$TMP/segment-$n.mp4" >> "$TMP/concat.txt"
}
make_segment 01 25 "$OV" "GEMINI OPS FLEET  /  CLINICAL COMMAND LEDGER"
make_segment 02 30 "$OV" "A FLEET, NOT A CHATBOT  /  GOVERNED AGENTS"
make_segment 03 30 "$OV" "ASYNC EVENTS  /  SQL SCOPE  /  HUMAN GATE"
make_segment 04 30 "$OV" "EVIDENCE-LED APPROVAL QUEUE  /  GEMINI SUMMARY"
make_segment 05 30 "$OV" "HUMAN GATE  /  HTTP 409 CONFLICT"
make_segment 06 30 "$OV" "SERVER-DERIVED IDENTITY  /  AUDIT TRAIL"
make_segment 07 25 "$AD" "BULK GOVERNANCE  /  DRY-RUN  /  SSE INBOX"
make_segment 08 25 "$AD" "STREAM HEALTH  /  PROMETHEUS  /  TREND MONITORING"
make_segment 09 18 "$OV" "AUTOMATION WITH A VISIBLE BOUNDARY"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/concat.txt" -c copy "$TMP/visuals.mp4"
ffmpeg -y -loglevel error -i "$TMP/visuals.mp4" -i "$ROOT/docs/gemini-ops-fleet-voiceover.wav" \
  -vf "subtitles=$ROOT/docs/devpost-video-ko.srt:force_style='FontName=Noto Sans CJK KR,FontSize=12,Outline=1,Shadow=0,Alignment=2,MarginV=18'" \
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest "$OUT"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUT"
