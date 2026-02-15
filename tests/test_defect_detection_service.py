"""
TDD: 商品瑕疵自动识别服务测试
先写测试 → 看它失败 → 写最少代码让它通过
"""
import pytest
from unittest.mock import AsyncMock, patch


class TestDefectDetectionTextAnalysis:
    """基于文本的瑕疵检测（纯计算逻辑）"""

    def setup_method(self):
        from src.services.defect_detection_service import DefectDetectionService
        self.service = DefectDetectionService()

    def test_detect_scratches_from_description(self):
        """从描述中检测划痕关键词"""
        desc = "MacBook Air M1, 外壳有轻微划痕，屏幕完好，功能正常"
        defects = self.service.detect_text_defects(desc)
        assert len(defects) > 0
        categories = [d["category"] for d in defects]
        assert "scratch" in categories

    def test_detect_dent_keywords(self):
        """检测磕碰凹痕"""
        desc = "手机壳边角有磕碰，边框有凹痕，其他完好"
        defects = self.service.detect_text_defects(desc)
        categories = [d["category"] for d in defects]
        assert "dent" in categories

    def test_detect_screen_issue(self):
        """检测屏幕问题"""
        desc = "屏幕有漏光现象，左上角有一条亮线"
        defects = self.service.detect_text_defects(desc)
        categories = [d["category"] for d in defects]
        assert "screen" in categories

    def test_detect_battery_issue(self):
        """检测电池问题"""
        desc = "电池续航不太行了，充放电已经800次"
        defects = self.service.detect_text_defects(desc)
        categories = [d["category"] for d in defects]
        assert "battery" in categories

    def test_no_defects_clean_description(self):
        """无瑕疵描述应返回空列表"""
        desc = "全新未拆封，配件齐全"
        defects = self.service.detect_text_defects(desc)
        assert len(defects) == 0

    def test_multiple_defects(self):
        """多个瑕疵同时检测"""
        desc = "屏幕有划痕，电池循环300次，边角有磕碰"
        defects = self.service.detect_text_defects(desc)
        categories = [d["category"] for d in defects]
        assert len(defects) >= 3
        assert "scratch" in categories
        assert "battery" in categories
        assert "dent" in categories

    def test_defect_has_required_fields(self):
        """每个瑕疵结果应包含 category, keyword, severity"""
        desc = "有轻微划痕"
        defects = self.service.detect_text_defects(desc)
        for d in defects:
            assert "category" in d
            assert "keyword" in d
            assert "severity" in d


class TestDefectSeverity:
    """瑕疵严重程度评估"""

    def setup_method(self):
        from src.services.defect_detection_service import DefectDetectionService
        self.service = DefectDetectionService()

    def test_minor_severity(self):
        """轻微瑕疵"""
        desc = "轻微使用痕迹，几乎看不出"
        defects = self.service.detect_text_defects(desc)
        if defects:
            assert defects[0]["severity"] in ("minor", "moderate", "major")

    def test_calculate_condition_score(self):
        """根据瑕疵列表计算成色评分"""
        defects = [
            {"category": "scratch", "severity": "minor"},
            {"category": "dent", "severity": "minor"},
        ]
        score = self.service.calculate_condition_score(defects)
        assert 0 <= score <= 100
        assert score > 60  # 两个轻微瑕疵应该还算不错

    def test_no_defects_perfect_score(self):
        """无瑕疵应得高分"""
        score = self.service.calculate_condition_score([])
        assert score >= 95

    def test_major_defects_low_score(self):
        """严重瑕疵应得低分"""
        defects = [
            {"category": "screen", "severity": "major"},
            {"category": "battery", "severity": "major"},
            {"category": "functional", "severity": "major"},
        ]
        score = self.service.calculate_condition_score(defects)
        assert score < 50


class TestDefectPriceImpact:
    """瑕疵对价格的影响"""

    def setup_method(self):
        from src.services.defect_detection_service import DefectDetectionService
        self.service = DefectDetectionService()

    def test_estimate_price_reduction(self):
        """估算瑕疵导致的降价幅度"""
        defects = [
            {"category": "scratch", "severity": "minor"},
        ]
        reduction = self.service.estimate_price_reduction(defects, base_price=3000)
        assert 0 < reduction < 3000
        assert reduction < 300  # 轻微划痕降价应小于10%

    def test_no_defects_no_reduction(self):
        """无瑕疵不降价"""
        reduction = self.service.estimate_price_reduction([], base_price=3000)
        assert reduction == 0

    def test_major_defect_significant_reduction(self):
        """严重瑕疵应有显著降价"""
        defects = [
            {"category": "screen", "severity": "major"},
        ]
        reduction = self.service.estimate_price_reduction(defects, base_price=3000)
        assert reduction >= 300  # 至少10%


class TestDefectDetectionAI:
    """AI 驱动的瑕疵识别测试"""

    def setup_method(self):
        from src.services.defect_detection_service import DefectDetectionService
        self.service = DefectDetectionService()

    @pytest.mark.anyio
    async def test_ai_detect_defects(self):
        """AI 瑕疵识别应返回结构化结果"""
        mock_ai_result = {
            "defects": [
                {"category": "scratch", "location": "背面", "severity": "minor",
                 "description": "背面有轻微划痕"},
                {"category": "dent", "location": "边角", "severity": "moderate",
                 "description": "右下角有明显磕碰"},
            ],
            "overall_condition": "good",
            "condition_score": 75,
        }

        with patch.object(self.service, "_call_ai_defect_detection", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_ai_result
            result = await self.service.detect_defects_with_ai(
                description="MacBook Air M1，背面有划痕，边角有磕碰",
                image_paths=[],
            )

        assert "defects" in result
        assert len(result["defects"]) == 2
        assert "overall_condition" in result

    @pytest.mark.anyio
    async def test_ai_unavailable_fallback_to_text(self):
        """AI 不可用时应回退到文本检测"""
        with patch.object(self.service, "_call_ai_defect_detection", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = None
            result = await self.service.detect_defects_with_ai(
                description="屏幕有划痕",
                image_paths=[],
            )

        # 应回退到文本检测
        assert "defects" in result
        assert len(result["defects"]) > 0
