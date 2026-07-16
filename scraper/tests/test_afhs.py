from pathlib import Path

from scraper.afhs import parse_coaches, parse_season_games, parse_year_list

FIXTURES = Path(__file__).parent / "fixtures"


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8", errors="ignore")


class TestParseSeasonGames:
    def test_parses_full_2025_oxford_season(self):
        games = parse_season_games(_read("afhs_games_2025.html"), team="Oxford", year=2025)
        assert len(games) == 13
        first = games[0]
        assert first["opponent"] == "Collierville TN"
        assert first["loc"] == "away"
        assert (first["teamScore"], first["oppScore"]) == (39, 36)
        assert first["result"] == "W"
        assert first["ot"] == "OT"

    def test_marks_district_games(self):
        games = parse_season_games(_read("afhs_games_2025.html"), team="Oxford", year=2025)
        by_opp = {g["opponent"]: g for g in games}
        assert by_opp["Madison Central"]["district"] is True
        assert by_opp["Tupelo"]["district"] is False

    def test_playoff_rounds_attached(self):
        games = parse_season_games(_read("afhs_games_2025.html"), team="Oxford", year=2025)
        playoffs = [g for g in games if g["playoff"]]
        assert len(playoffs) >= 3
        assert any("Semi" in g["playoff"] for g in playoffs)

    def test_open_weeks_skipped(self):
        games = parse_season_games(_read("afhs_games_2025.html"), team="Oxford", year=2025)
        assert all(g["opponent"].upper() != "OPEN" for g in games)


class TestParseCoaches:
    def test_current_coach_and_stints(self):
        page = parse_coaches(_read("afhs_coaches.html"), team="Oxford")
        assert page["currentCoach"] == "Chris Cutcliffe"
        assert len(page["stints"]) == 11
        cut = page["stints"][0]
        assert cut["coach"] == "Chris Cutcliffe"
        assert (cut["startYear"], cut["endYear"]) == (2016, 2026)
        assert (cut["wins"], cut["losses"], cut["ties"]) == (88, 35, 0)

    def test_two_digit_year_ranges_expand(self):
        page = parse_coaches(_read("afhs_coaches.html"), team="Oxford")
        hill = [s for s in page["stints"] if s["coach"] == "Johnny Hill"]
        assert {(s["startYear"], s["endYear"]) for s in hill} == {(2000, 2015), (1992, 1995)}


class TestParseYearList:
    def test_year_dropdown(self):
        years = parse_year_list(_read("afhs_games_2025.html"))
        assert years[0] == 1970
        assert years[-1] == 2026
