# Microsoft To Do Business Dashboard

Power Apps Code Apps と React で構築した、Microsoft To Do 連携の業務向けタスク管理ダッシュボードです。

![Power Apps Code Apps](https://img.shields.io/badge/Power%20Apps-Code%20Apps-0A6EBD)
![React](https://img.shields.io/badge/React-TypeScript-149ECA)
![Microsoft To Do](https://img.shields.io/badge/Connector-Microsoft%20To%20Do-2564CF)
![License](https://img.shields.io/badge/License-MIT-green)

## 概要

本アプリは、Microsoft To Do に登録されているタスクを一覧化し、日々の業務を効率的に管理するためのダッシュボードです。

Power Apps Code Apps で Microsoft To Do コネクターをデータソースとして追加し、自動生成された TypeScript のモデルとサービスを React から呼び出しています。

## 主な機能

### タスクリスト管理

- Microsoft To Do のリスト取得
- 利用するリストの切り替え
- リストごとのタスク表示

### タスク管理

- 新しいタスクの登録
- タスクの完了・未完了切り替え
- タスクの削除
- 期限、重要度、状態、メモの設定
- リマインダー日時の設定

### 検索・絞り込み

- タスク名による検索
- メモ内容による検索
- 状態による絞り込み
- 重要度による絞り込み

### ダッシュボード

- 全タスク数
- 未完了タスク数
- 期限超過タスク数
- 重要タスク数

## 状態と重要度

### 対応する状態

- 未着手
- 進行中
- 完了
- 確認待ち
- 延期

### 対応する重要度

- 重要
- 標準
- 低

## スクリーンショット

![タスク管理ダッシュボード](images/app-dashboard.png)

## 技術構成

| 項目 | 内容 |
|---|---|
| プラットフォーム | Power Apps Code Apps |
| フレームワーク | React |
| 言語 | TypeScript |
| ビルドツール | Vite |
| データソース | Microsoft To Do コネクター |
| UI | Custom CSS |
| 認証・接続管理 | Power Platform |

## プロジェクト構成

```text
src/
├── App.tsx
├── App.css
├── index.css
└── generated/
    ├── models/
    │   └── MicrosoftTo_Do_Business_Model.ts
    └── services/
        └── MicrosoftTo_Do_Business_Service.ts
```

> `generated` フォルダー内のファイル名は、環境やコネクターの生成結果によって異なる場合があります。実際に生成されたモデル、サービス、メソッドの名前を確認してください。

## 前提条件

- Power Apps Code Apps を利用できる Power Platform 環境
- Microsoft To Do を利用できる Microsoft 365 アカウント
- Microsoft To Do コネクターの接続
- Node.js
- npm
- Git
- Power Platform CLI
- Power Apps CLI

## セットアップ

### 1. リポジトリを取得

```bash
git clone <repository-url>
cd my-todo-app
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. Power Platform に認証

GitHub Codespaces など、ブラウザーとターミナルが分かれている環境ではデバイスコード認証を利用します。

```bash
pac auth create --deviceCode
```

接続状態を確認します。

```bash
pac auth list
```

### 4. Power Platform 環境を選択

```bash
pac env list
pac env select --environment <Environment-ID>
```

選択した環境を確認します。

```bash
pac env who
```

### 5. Code App を初期化

新規プロジェクトとして構築する場合は、次のコマンドで初期化します。

```bash
pac code init --displayname "To Do タスク管理ダッシュボード"
```

### 6. Microsoft To Do の接続 ID を確認

Power Apps の接続画面で Microsoft To Do の接続を作成した後、接続一覧を確認します。

```bash
pac connection list
```

### 7. Microsoft To Do コネクターを追加

`<Connector-API-Name>` と `<Connection-ID>` は、利用環境で確認した実際の値に置き換えてください。

```bash
pac code add-data-source \
  -a <Connector-API-Name> \
  -c <Connection-ID>
```

成功すると、`src/generated` 以下に TypeScript のモデルとサービスが生成されます。

## ローカル実行

```bash
npm run dev
```

Power Apps Code Apps のローカル実行コマンドを利用する場合は、プロジェクト構成に応じて次を実行します。

```bash
npx power-apps run
```

## ビルド

```bash
npm run build
```

ビルドに成功すると、`dist` フォルダーが生成されます。

## Power Platform へ公開

```bash
pac code push
```

## 実装例

### To Do リストを取得

```tsx
const result =
  await MicrosoftTo_Do_Business_Service.GetAllTodoListsV2();

const lists = result.data ?? [];
```

### 選択したリストのタスクを取得

```tsx
const result =
  await MicrosoftTo_Do_Business_Service.ListToDosByFolderV2(
    folderId,
    200,
  );

const tasks = result.data ?? [];
```

### タスクを作成

```tsx
await MicrosoftTo_Do_Business_Service.CreateToDoV3(
  selectedListId,
  requestBody,
);
```

### タスクを更新

```tsx
await MicrosoftTo_Do_Business_Service.UpdateToDoV2(
  selectedListId,
  taskId,
  updateBody,
);
```

### タスクを削除

```tsx
await MicrosoftTo_Do_Business_Service.DeleteToDoV2(
  selectedListId,
  taskId,
);
```

## TypeScript の注意点

このプロジェクトでは、TypeScript の `verbatimModuleSyntax` が有効な場合、型を `type-only import` で読み込む必要があります。

誤った例:

```tsx
import { FormEvent, useState } from "react";
```

正しい例:

```tsx
import { useState } from "react";
import type { FormEvent } from "react";
```

型と実行時に利用する関数を分けてインポートすることで、次のエラーを回避できます。

```text
TS1484: 'FormEvent' is a type and must be imported using a type-only import
when 'verbatimModuleSyntax' is enabled.
```

## デザイン

青をブランドカラーとして、次の要素を取り入れています。

- グラデーションを利用したヘッダー
- タスクリスト用サイドバー
- KPI カード
- 状態・重要度のバッジ表示
- タスク登録用モーダルダイアログ
- PC 向けテーブルレイアウト
- 画面幅に応じたレスポンシブ表示

## このサンプルで学べること

- Power Apps Code Apps の基本構成
- 非テーブル型コネクターの利用
- 自動生成された TypeScript サービスの呼び出し
- 自動生成されたモデルを使った型安全な実装
- React Hooks による状態管理
- 検索、絞り込み、並べ替えの実装
- タスクの作成、更新、削除
- 業務ダッシュボードの UI 設計
- Power Platform へのビルドと公開

## 今後の拡張案

- タスク編集画面
- カンバン表示
- 期限別グループ表示
- カテゴリ表示
- 繰り返しタスク対応
- Teams 通知
- Outlook や Planner との連携
- タスクの進捗グラフ
- Copilot を利用した優先順位や作業計画の提案

## 関連記事

このリポジトリの詳しい作成手順は、note の解説記事に掲載予定です。

- Power Apps Code Apps + Dataverse
- Power Apps Code Apps + SharePoint
- Power Apps Code Apps + Office 365 Users
- Power Apps Code Apps + Microsoft To Do

## 注意事項

- コネクターから生成されるモデル、サービス、メソッド名は、環境やコネクターのバージョンによって異なる場合があります。
- 実装前に `src/generated/models` と `src/generated/services` の内容を確認してください。
- 接続 ID、環境 ID、テナント情報などの機密情報をリポジトリへコミットしないでください。
- `generated` フォルダーをリポジトリへ含めるかどうかは、開発・再生成・配布方針に合わせて判断してください。

## ライセンス

このリポジトリを MIT License で公開する場合は、ルートフォルダーに `LICENSE` ファイルを追加してください。

## Author

**Shinichi Kawara**

- Microsoft Certified Trainer
- Power Platform
- Copilot Studio
- Power Apps Code Apps
