#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""创建 GitHub Release 并上传 APK 产物。

用标准库实现，避免为一次性发布引入 requests 依赖。
凭据从 git credential manager 读取，不在命令行或日志中出现。
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

REPO = 'muyuewang/lx-music-newui'
TAG = 'v1.9.8'
RELEASE_NAME = 'v1.9.8 · 弹窗全量主题化'
API = 'https://api.github.com'

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APK_DIR = os.path.join(PROJ, 'android', 'app', 'build', 'outputs', 'apk', 'release')
CHANGELOG = os.path.join(PROJ, 'publish', 'changeLog.md')

ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86', 'universal']


def token():
    """从 git credential manager 取 GitHub 令牌。"""
    p = subprocess.run(
        ['git', 'credential', 'fill'],
        input='protocol=https\nhost=github.com\n\n',
        capture_output=True, text=True,
    )
    for line in p.stdout.splitlines():
        if line.startswith('password='):
            return line.split('=', 1)[1]
    raise SystemExit('无法从凭据管理器取得令牌')


TOKEN = token()


def call(method, url, data=None, content_type='application/json', raw=None):
    headers = {
        'Authorization': 'Bearer ' + TOKEN,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'release-script',
        'X-GitHub-Api-Version': '2022-11-28',
    }
    body = None
    if raw is not None:
        body = raw
        headers['Content-Type'] = content_type
    elif data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            txt = r.read().decode('utf-8', 'replace')
            return r.status, (json.loads(txt) if txt.strip() else {})
    except urllib.error.HTTPError as e:
        txt = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, {'raw': txt[:500]}


def main():
    body = open(CHANGELOG, encoding='utf-8').read()

    # 1) 创建 Release（已存在则复用）
    print('[1/3] 创建 Release', TAG)
    st, res = call('POST', f'{API}/repos/{REPO}/releases', {
        'tag_name': TAG,
        'target_commitish': 'master',
        'name': RELEASE_NAME,
        'body': body,
        'draft': False,
        'prerelease': False,
    })
    if st == 201:
        release = res
        print('    已创建:', release['html_url'])
    elif st == 422:
        print('    Release 已存在，读取现有记录')
        st2, release = call('GET', f'{API}/repos/{REPO}/releases/tags/{TAG}')
        if st2 != 200:
            print('    获取失败:', st2, release)
            return 1
        print('    复用:', release['html_url'])
    else:
        print('    创建失败:', st, res)
        return 1

    up_url = release['upload_url'].split('{')[0]

    # 2) 逐个上传，已存在同名的先删掉
    existing = {a['name']: a['id'] for a in release.get('assets', [])}
    print('[2/3] 上传安装包')
    ok = 0
    for abi in ABIS:
        name = f'lx-music-newui-{TAG}-{abi}.apk'
        path = os.path.join(APK_DIR, name)
        if not os.path.isfile(path):
            print(f'    ! 缺文件 {name}')
            continue

        if name in existing:
            print(f'    - 已存在，先删除 {name}')
            call('DELETE', f'{API}/repos/{REPO}/releases/assets/{existing[name]}')

        size = os.path.getsize(path)
        print(f'    > {name} ({size/1048576:.1f} MB) 上传中...')
        with open(path, 'rb') as f:
            st, res = call(
                'POST', f'{up_url}?name={name}',
                content_type='application/vnd.android.package-archive',
                raw=f.read(),
            )
        if st == 201:
            print(f'      完成，大小 {res["size"]/1048576:.1f} MB')
            ok += 1
        else:
            print(f'      失败 {st}: {str(res)[:300]}')

    # 3) 核对
    print('[3/3] 核对线上产物')
    st, rel = call('GET', f'{API}/repos/{REPO}/releases/tags/{TAG}')
    if st == 200:
        for a in rel.get('assets', []):
            print(f'    {a["name"]:48} {a["size"]/1048576:6.1f} MB')
        print('    页面:', rel['html_url'])

    return 0 if ok == len(ABIS) else 2


if __name__ == '__main__':
    sys.exit(main())