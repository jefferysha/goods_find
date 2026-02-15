"""
商品瑕疵自动识别服务
基于文本关键词匹配 + AI 图像分析，自动识别商品瑕疵。
"""
import re
from typing import Dict, List, Optional, Any
from src.infrastructure.external.ai_client import AIClient


# 瑕疵关键词库
DEFECT_PATTERNS = {
    "scratch": {
        "keywords": [
            r"划痕", r"刮痕", r"划伤", r"刮伤", r"磨损", r"使用痕迹",
            r"掉漆", r"脱漆", r"漆面",
        ],
        "severity_hints": {
            "minor": [r"轻微", r"细微", r"几乎看不", r"不明显"],
            "major": [r"严重", r"明显", r"深度", r"大面积"],
        },
    },
    "dent": {
        "keywords": [
            r"磕碰", r"凹痕", r"凹陷", r"碰撞", r"变形", r"弯曲",
        ],
        "severity_hints": {
            "minor": [r"轻微", r"小", r"细微"],
            "major": [r"严重", r"明显", r"大"],
        },
    },
    "screen": {
        "keywords": [
            r"漏光", r"亮线", r"暗点", r"坏点", r"碎屏", r"裂屏",
            r"屏幕.*(?:划痕|刮痕|问题|异常)", r"(?:划痕|刮痕).*屏幕",
        ],
        "severity_hints": {
            "minor": [r"轻微", r"小"],
            "major": [r"严重", r"碎", r"裂", r"大面积"],
        },
    },
    "battery": {
        "keywords": [
            r"电池.*(?:不行|不太行|衰减|老化|鼓包)",
            r"充放电.*\d+",
            r"循环.*\d+",
            r"续航.*(?:不行|不好|差|短)",
            r"(?:电池|battery).*(?:health|健康度)",
        ],
        "severity_hints": {
            "minor": [r"轻微"],
            "major": [r"鼓包", r"严重", r"不行"],
        },
    },
    "functional": {
        "keywords": [
            r"(?:按键|键盘).*(?:不灵|失灵|坏)",
            r"(?:接口|端口).*(?:松动|不好使|坏)",
            r"(?:摄像头|镜头).*(?:模糊|坏|问题)",
            r"(?:扬声器|喇叭|话筒).*(?:坏|杂音|不响)",
            r"(?:Wi-?Fi|蓝牙|信号).*(?:不好|弱|断)",
        ],
        "severity_hints": {
            "minor": [r"偶尔"],
            "major": [r"完全", r"彻底", r"不能"],
        },
    },
}

# 每种瑕疵对价格的影响百分比 (severity → percent)
PRICE_IMPACT = {
    "scratch": {"minor": 0.03, "moderate": 0.06, "major": 0.10},
    "dent": {"minor": 0.04, "moderate": 0.08, "major": 0.12},
    "screen": {"minor": 0.05, "moderate": 0.12, "major": 0.25},
    "battery": {"minor": 0.05, "moderate": 0.10, "major": 0.20},
    "functional": {"minor": 0.08, "moderate": 0.15, "major": 0.30},
}

# 每种严重程度的成色扣分
SEVERITY_DEDUCTION = {"minor": 5, "moderate": 15, "major": 30}


class DefectDetectionService:
    """商品瑕疵自动识别服务"""

    def __init__(self):
        self.ai_client = AIClient()

    # ── 文本检测 ────────────────────────────────────────────

    def detect_text_defects(self, description: str) -> List[Dict[str, str]]:
        """从商品描述文本中检测瑕疵关键词"""
        if not description:
            return []

        defects = []
        for category, config in DEFECT_PATTERNS.items():
            for keyword_pattern in config["keywords"]:
                if re.search(keyword_pattern, description):
                    severity = self._determine_severity(description, config.get("severity_hints", {}))
                    defects.append({
                        "category": category,
                        "keyword": keyword_pattern,
                        "severity": severity,
                    })
                    break  # 每个类别只取一次

        return defects

    def _determine_severity(self, text: str, severity_hints: Dict[str, List[str]]) -> str:
        """根据修饰词判断瑕疵严重程度"""
        for hint in severity_hints.get("major", []):
            if re.search(hint, text):
                return "major"
        for hint in severity_hints.get("minor", []):
            if re.search(hint, text):
                return "minor"
        return "moderate"  # 默认中等

    # ── 成色评分 ────────────────────────────────────────────

    def calculate_condition_score(self, defects: List[Dict[str, str]]) -> float:
        """
        根据瑕疵列表计算成色评分（0-100）。
        无瑕疵 = 100 分，每个瑕疵按严重程度扣分。
        """
        score = 100.0
        for d in defects:
            severity = d.get("severity", "moderate")
            score -= SEVERITY_DEDUCTION.get(severity, 15)
        return max(0, round(score, 2))

    # ── 价格影响 ────────────────────────────────────────────

    def estimate_price_reduction(
        self, defects: List[Dict[str, str]], base_price: float
    ) -> float:
        """估算瑕疵导致的降价金额"""
        if not defects or base_price <= 0:
            return 0

        total_percent = 0.0
        for d in defects:
            category = d.get("category", "scratch")
            severity = d.get("severity", "moderate")
            percent = PRICE_IMPACT.get(category, {}).get(severity, 0.05)
            total_percent += percent

        # 最多降价 60%
        total_percent = min(total_percent, 0.60)
        return round(base_price * total_percent, 2)

    # ── AI 瑕疵识别 ────────────────────────────────────────

    async def _call_ai_defect_detection(
        self, description: str, image_paths: List[str]
    ) -> Optional[Dict]:
        """调用 AI 进行瑕疵识别"""
        if not self.ai_client.is_available():
            return None

        prompt = f"""请分析以下二手商品，识别所有可能的瑕疵。

商品描述: {description}

请以 JSON 格式输出:
{{
    "defects": [
        {{
            "category": "scratch|dent|screen|battery|functional|other",
            "location": "具体位置",
            "severity": "minor|moderate|major",
            "description": "瑕疵描述"
        }}
    ],
    "overall_condition": "excellent|good|fair|poor",
    "condition_score": 0-100
}}"""

        try:
            product_data = {"description": description}
            result = await self.ai_client.analyze(product_data, image_paths, prompt)
            return result
        except Exception as e:
            print(f"AI 瑕疵检测失败: {e}")
            return None

    async def detect_defects_with_ai(
        self, description: str, image_paths: List[str]
    ) -> Dict[str, Any]:
        """
        使用 AI 识别瑕疵，AI 不可用时回退到文本检测。
        """
        ai_result = await self._call_ai_defect_detection(description, image_paths)

        if ai_result and "defects" in ai_result:
            return ai_result

        # AI 不可用或返回异常，回退到文本检测
        text_defects = self.detect_text_defects(description)
        condition_score = self.calculate_condition_score(text_defects)

        condition = "good"
        if condition_score >= 90:
            condition = "excellent"
        elif condition_score >= 70:
            condition = "good"
        elif condition_score >= 50:
            condition = "fair"
        else:
            condition = "poor"

        return {
            "defects": text_defects,
            "overall_condition": condition,
            "condition_score": condition_score,
            "source": "text_analysis",
        }
