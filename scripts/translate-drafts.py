#!/usr/bin/env python3
"""Generate Chinese *draft* translations using an offline Argos model.
No API key is needed. Technical names, code, Markdown tables and numbers
are guarded; drafts must not be represented as reviewed full translations.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/"dist/data/docs.json"
OUT=ROOT/"content/draft-translations.json"
FULL=ROOT/"content/full-translations.json"
PROTECTED=re.compile(r"(\x60[^\x60\n]+\x60|\[[^\]]+\]\([^)]+\)|https?://[^\s)]+|(?<![A-Za-z0-9_])[a-z][a-z0-9]*_[a-z0-9_]+|(?<![A-Za-z0-9_])[a-z]+[A-Z][A-Za-z0-9]*)")
NUM=re.compile(r"\d+")
EN=re.compile(r"[a-zA-Z]{3,}")
ZH=re.compile(r"[\u4e00-\u9fff]")
SEPARATOR=re.compile(r"^:?-{3,}:?$")
GLOSSARY={"Parameter":"参数","Field":"字段","Type":"类型","Required":"必填","Description":"说明","Optional":"可选","Yes":"是","No":"否"}
PRIORITY=["sendMessage","banChatMember","restrictChatMember","sendPhoto",
          "sendDocument","sendVideo","sendInvoice","copyMessage",
          "forwardMessage","editMessageText","InlineKeyboardButton",
          "InlineKeyboardMarkup","ChatPermissions","Message","Update"]

def setup():
    from argostranslate import package,translate
    package.update_package_index()
    models=package.get_available_packages()
    chosen=next((item for item in models if item.from_code=="en" and item.to_code=="zh"),None)
    if not chosen:raise RuntimeError("Missing en-zh offline Argos model")
    package.install_from_path(chosen.download())
    return translate.get_translation_from_codes("en","zh")

def doc_translate(body,model):
    cached={}
    done=0
    fallback=0
    def plain(span):
        nonlocal done,fallback
        if not EN.search(span):return span
        key=span.strip()
        if key in GLOSSARY:return GLOSSARY[key]
        if span in cached:return cached[span]
        try:
            result=model.translate(key).replace("\n"," ").strip()
            if not result or Counter(NUM.findall(span))!=Counter(NUM.findall(result)) or not ZH.search(result):
                fallback+=1
                cached[span]=span
                return span
            done+=1
            output=(" " if span.startswith(" ") else "")+result+(" " if span.endswith(" ") else "")
            cached[span]=output
            return output
        except Exception:
            fallback+=1
            cached[span]=span
            return span
    def prose(s):
        return "".join(part if PROTECTED.fullmatch(part or "") else plain(part)
                       for part in PROTECTED.split(s))
    def row(line):
        parts=[c.strip() for c in line.strip()[1:-1].split("|")]
        if not parts or all(SEPARATOR.fullmatch(p) for p in parts):return line
        if len(parts) in (3,4):
            cells=[GLOSSARY.get(parts[0],parts[0]),GLOSSARY.get(parts[1],parts[1])]
            if len(parts)==4:cells.append(GLOSSARY.get(parts[2],parts[2]))
            cells.append(GLOSSARY.get(parts[-1],prose(parts[-1])))
        else:cells=[prose(p) for p in parts]
        return "| "+" | ".join(cells)+" |"
    out=[]
    fenced=False
    for line in body.replace("\r\n","\n").split("\n"):
        t=line.strip()
        if t.startswith("~~~") or t.startswith(chr(96)*3):
            fenced=not fenced
            out.append(line)
        elif fenced or not t or line.startswith("    "):
            out.append(line)
        elif t.startswith("|") and t.endswith("|"):
            out.append(row(line))
        else:
            m=re.match(r"^(\s*(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+))(.+)$",line)
            out.append(m.group(1)+prose(m.group(2)) if m else prose(line))
    return "\n".join(out),done,fallback

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--limit",type=int,default=1000)
    args=parser.parse_args()
    docs=json.loads(DOCS.read_text(encoding="utf-8"))
    verified=json.loads(FULL.read_text(encoding="utf-8"))
    existing=json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    remaining=[s for s in docs["sections"] if s["title"] not in verified and
               (s["title"] not in existing or existing[s["title"]].get("sourceHash")!=s["hash"])]
    remaining.sort(key=lambda s:(PRIORITY.index(s["title"]) if s["title"] in PRIORITY else 999,
                                 0 if s["kind"]=="method" else 1,len(s["body"])))
    wanted=remaining[:args.limit]
    if not wanted:
        print("Nothing to translate");return
    print("Installing offline en-zh Argos model for",len(wanted),"chapters",flush=True)
    model=setup()
    saved=0;all_done=0;all_fallback=0
    for i,sec in enumerate(wanted,1):
        translated,done,fallback=doc_translate(sec["body"],model)
        input_keys=[s.split("|")[1].strip() for s in sec["body"].splitlines()
                    if s.strip().startswith("|") and s.strip().endswith("|") and len(s.split("|"))>3]
        translated_keys=[s.split("|")[1].strip() for s in translated.splitlines()
                         if s.strip().startswith("|") and s.strip().endswith("|") and len(s.split("|"))>3]
        if input_keys!=translated_keys or done<1:
            print("SKIPPED integrity/coverage:",sec["title"],"done=",done,"fallback=",fallback,"inputRows=",len(input_keys),"translatedRows=",len(translated_keys),"inputHead=",input_keys[:4],"translatedHead=",translated_keys[:4],"sample=",repr(translated[:220]),flush=True)
            continue
        existing[sec["title"]]={"sourceHash":sec["hash"],"text":translated,
                                "model":"Argos en→zh",
                                "translatedSegments":done,"fallbackSegments":fallback}
        saved+=1;all_done+=done;all_fallback+=fallback
        print("DRAFT",i,"/",len(wanted),sec["title"],"translated",done,
              "unchanged",fallback,flush=True)
    OUT.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Finished",saved,"new drafts; total",len(existing),
          "translated fragments",all_done,"English fallbacks",all_fallback,flush=True)
if __name__=="__main__":main()
