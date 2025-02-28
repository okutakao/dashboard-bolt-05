import { WritingTone } from '../types';

type MockOutline = {
  id: string;
  title: string;
  sections: Array<{
    title: string;
    description: string;
    content?: string;
    recommendedLength?: number;
  }>;
};

const mockOutlines: Record<WritingTone, MockOutline[]> = {
  casual: [
    {
      id: 'python-beginner',
      title: "初心者でも分かる！Pythonプログラミング入門",
      sections: [
        {
          title: "1. Pythonって何？基礎知識を理解しよう",
          description: "Pythonの特徴や利点、インストール方法について説明します。",
          recommendedLength: 800
        },
        {
          title: "2. プログラミングの第一歩：基本的な文法",
          description: "変数、データ型、条件分岐、繰り返し処理などの基本を学びます。",
          recommendedLength: 1000
        },
        {
          title: "3. 実践的なプログラムを作ってみよう",
          description: "簡単な計算機やゲームを作りながら、プログラミングの楽しさを体験します。",
          recommendedLength: 1200
        }
      ]
    },
    {
      id: 'web-dev-basics',
      title: "Webサイト制作の基本を学ぼう",
      sections: [
        {
          title: "1. HTMLとCSSの基礎",
          description: "Webページの構造とスタイリングの基本を理解します。",
          recommendedLength: 800
        },
        {
          title: "2. レスポンシブデザインの実践",
          description: "スマートフォンやタブレットに対応したデザインの作り方を学びます。",
          recommendedLength: 1000
        },
        {
          title: "3. JavaScriptで動きをつける",
          description: "簡単なアニメーションや機能を実装してWebサイトを活性化します。",
          recommendedLength: 1200
        }
      ]
    }
  ],
  business: [
    {
      id: 'python-business',
      title: "Python導入による業務効率化：企業のためのガイドライン",
      sections: [
        {
          title: "1. Python活用による業務改善の可能性",
          description: "企業におけるPython活用事例と期待される効果について分析します。",
          recommendedLength: 1000
        },
        {
          title: "2. 導入プロセスと必要なリソース",
          description: "システム要件、人材育成、コスト試算など、導入に向けた準備事項を解説します。",
          recommendedLength: 1200
        },
        {
          title: "3. ROI最大化のための実装戦略",
          description: "段階的な導入計画と効果測定の方法について提案します。",
          recommendedLength: 1000
        }
      ]
    },
    {
      id: 'digital-transformation',
      title: "DXで実現する業務改革の実践ガイド",
      sections: [
        {
          title: "1. デジタルトランスフォーメーションの本質",
          description: "DXの意義と企業における重要性について解説します。",
          recommendedLength: 1000
        },
        {
          title: "2. 業務プロセスの分析と改善",
          description: "現状の業務フローを分析し、デジタル化による改善点を特定します。",
          recommendedLength: 1200
        },
        {
          title: "3. 効果的な導入とチェンジマネジメント",
          description: "組織全体での円滑な導入を実現するための戦略を提案します。",
          recommendedLength: 1000
        }
      ]
    }
  ],
  academic: [
    {
      id: 'python-data-analysis',
      title: "Pythonを用いたデータ分析手法の体系的研究",
      sections: [
        {
          title: "1. データ分析におけるPythonの役割と特性",
          description: "統計解析やデータマイニングにおけるPythonの優位性を考察します。",
          recommendedLength: 1200
        },
        {
          title: "2. 主要なデータ分析ライブラリの比較分析",
          description: "NumPy、Pandas、Scipyなど、代表的なライブラリの特徴と使用方法を検証します。",
          recommendedLength: 1500
        },
        {
          title: "3. 実証研究：ケーススタディによる検証",
          description: "実データを用いた分析例を通じて、手法の有効性を実証的に検討します。",
          recommendedLength: 1300
        }
      ]
    },
    {
      id: 'machine-learning-research',
      title: "機械学習アルゴリズムの比較研究",
      sections: [
        {
          title: "1. 機械学習の理論的基礎",
          description: "主要な機械学習アルゴリズムの数理的背景を解説します。",
          recommendedLength: 1200
        },
        {
          title: "2. アルゴリズムの実装と評価",
          description: "各アルゴリズムの実装方法と性能評価指標について検討します。",
          recommendedLength: 1500
        },
        {
          title: "3. 実データセットによる比較実験",
          description: "複数のデータセットを用いて各アルゴリズムの性能を比較分析します。",
          recommendedLength: 1300
        }
      ]
    }
  ]
};

export { mockOutlines };
export type { MockOutline };