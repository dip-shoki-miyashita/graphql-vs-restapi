# Bookstore GraphQL & REST API サンプル

## 概要

このリポジトリは、GraphQLとREST APIの両方を提供する書籍管理アプリケーションのサンプルです。React（MUI）によるフロントエンド、Node.js（Express/ApolloServer）によるバックエンド、MySQLによるデータベースで構成されています。

## ディレクトリ構成

```
├── backend/    # Node.js/Express/ApolloServer バックエンド
├── frontend/   # React + MUI フロントエンド
├── init.sql    # DB初期化・サンプルデータ投入SQL
├── docker-compose.yml # 開発用コンテナ構成
```

## セットアップ方法

### 1. 必要要件
- Docker, Docker Compose

### 2. 起動手順

```sh
git clone <このリポジトリ>
cd ghec-graphql-vs-restapi
docker-compose up --build
```

- フロントエンド: http://localhost:3000
- バックエンド（APIサーバ）: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql
- MySQL: localhost:3307（ユーザ: bookstore, パスワード: bookstore）

### 3. DB初期化

`init.sql` が自動で実行され、テーブル作成とサンプルデータ投入が行われます。

## 技術スタック

- フロントエンド: React, MUI, Apollo Client, Axios
- バックエンド: Node.js, Express, Apollo Server, GraphQL, MySQL2, CORS, dotenv
- DB: MySQL 8
- 開発環境: Docker, docker-compose

## フロントエンド

- `frontend/` ディレクトリ
- `npm start` で http://localhost:3000 で起動
- GraphQL/REST API両対応のUI（タブ切替）

## バックエンド

- `backend/` ディレクトリ
- `npm start` で http://localhost:4000 で起動
- GraphQLエンドポイント: `/graphql`
- REST APIエンドポイント: `/api/*`

## 主なAPI仕様

### GraphQL
- エンドポイント: `POST http://localhost:4000/graphql`
- Playground: ブラウザでアクセス可

#### 主なクエリ例
```graphql
query {
  books {
    id
    title
    category { id name }
    author { id name birthday address }
    details { price comment }
  }
}
```

#### 主なミューテーション例
```graphql
mutation {
  createBook(title: "新しい本", categoryId: 1, authorId: 1, price: 1500, comment: "コメント") {
    id
    title
  }
}
```

### REST API
- ベースURL: `http://localhost:4000/api`

| メソッド | パス              | 内容           |
|----------|-------------------|----------------|
| GET      | /books            | 書籍一覧取得   |
| GET      | /books/:id        | 書籍詳細取得   |
| POST     | /books            | 書籍新規作成   |
| PUT      | /books/:id        | 書籍更新       |
| DELETE   | /books/:id        | 書籍削除       |
| GET      | /categories       | カテゴリ一覧   |
| GET      | /authors          | 著者一覧       |

#### POST/PUTリクエスト例
```json
{
  "title": "新しい本",
  "categoryId": 1,
  "authorId": 1,
  "price": 1500,
  "comment": "コメント"
}
```

## DBスキーマ

- Authors, Categories, Books, BookDetails テーブル
- 詳細は `init.sql` を参照

## ライセンス

MIT 