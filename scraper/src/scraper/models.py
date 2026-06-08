"""Canonical pydantic models for scraper output."""
from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_CLASS_PATTERN = re.compile(r"^(?:[1-7]A|MAIS-[1-6]A)$")
_SEASON_PATTERN = re.compile(r"^\d{4}-\d{2}$")
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

Position = Literal["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"]
PlayerClass = Literal["FR", "SO", "JR", "SR"]
GameStatus = Literal["final", "scheduled", "in_progress", "postponed"]
DataStatus = Literal["complete", "incomplete", "missing"]


class _Frozen(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=False)


class TeamRecord(_Frozen):
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)


class TeamRankings(_Frozen):
    stateOverall: int | None = None
    stateClass: int | None = None
    national: int | None = None


class TeamStats(_Frozen):
    pointsFor: int = 0
    pointsAgainst: int = 0
    yardsFor: int = 0
    yardsAgainst: int = 0
    passYdsFor: int = 0
    rushYdsFor: int = 0
    passYdsAgainst: int = 0
    rushYdsAgainst: int = 0
    turnoversForced: int = 0
    turnoversLost: int = 0


class TeamColors(_Frozen):
    primary: str | None = None
    secondary: str | None = None


class Team(_Frozen):
    id: str
    name: str
    mascot: str | None = None
    city: str | None = None
    classification: str
    district: str | None = None
    logoUrl: str | None = None
    colors: TeamColors = Field(default_factory=TeamColors)
    season: str
    record: TeamRecord
    rankings: TeamRankings = Field(default_factory=TeamRankings)
    stats: TeamStats = Field(default_factory=TeamStats)
    headCoach: str | None = None
    maxprepsUrl: str | None = None

    @field_validator("classification")
    @classmethod
    def _valid_class(cls, v: str) -> str:
        if not _CLASS_PATTERN.match(v):
            raise ValueError(f"invalid classification: {v}")
        return v

    @field_validator("season")
    @classmethod
    def _valid_season(cls, v: str) -> str:
        if not _SEASON_PATTERN.match(v):
            raise ValueError(f"invalid season: {v}")
        return v

    @field_validator("colors", mode="before")
    @classmethod
    def _coerce_colors(cls, v):
        if v is None:
            return TeamColors()
        if isinstance(v, dict):
            return TeamColors(**v)
        return v


class PassingStats(_Frozen):
    model_config = ConfigDict(extra="forbid", frozen=False, populate_by_name=True)

    att: int = 0
    cmp: int = 0
    yds: int = 0
    td: int = 0
    interceptions: int = Field(0, alias="int")
    rating: float = 0.0


class RushingStats(_Frozen):
    att: int = 0
    yds: int = 0
    td: int = 0
    ypc: float = 0.0


class ReceivingStats(_Frozen):
    rec: int = 0
    yds: int = 0
    td: int = 0


class DefenseStats(_Frozen):
    model_config = ConfigDict(extra="forbid", frozen=False, populate_by_name=True)

    tackles: int = 0
    sacks: float = 0.0
    interceptions: int = Field(0, alias="int")
    ff: int = 0


class KickingStats(_Frozen):
    fgm: int = 0
    fga: int = 0
    xpm: int = 0
    xpa: int = 0


class PlayerStats(_Frozen):
    passing: PassingStats = Field(default_factory=PassingStats)
    rushing: RushingStats = Field(default_factory=RushingStats)
    receiving: ReceivingStats = Field(default_factory=ReceivingStats)
    defense: DefenseStats = Field(default_factory=DefenseStats)
    kicking: KickingStats = Field(default_factory=KickingStats)

    @field_validator("passing", "rushing", "receiving", "defense", "kicking", mode="before")
    @classmethod
    def _coerce_dicts(cls, v):
        return v if v is not None else {}


class Player(_Frozen):
    id: str
    teamId: str
    season: str
    name: str
    jersey: str | None = None
    position: Position
    playerClass: PlayerClass = Field(alias="class")
    height: str | None = None
    weight: int | None = None
    stats: PlayerStats = Field(default_factory=PlayerStats)
    gamesPlayed: int = 0

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    @field_validator("season")
    @classmethod
    def _valid_season(cls, v: str) -> str:
        if not _SEASON_PATTERN.match(v):
            raise ValueError(f"invalid season: {v}")
        return v


class BoxScoreEntry(_Frozen):
    model_config = ConfigDict(extra="forbid", frozen=False, populate_by_name=True)

    playerId: str
    cmp: int | None = None
    att: int | None = None
    yds: int | None = None
    td: int | None = None
    interceptions: int | None = Field(None, alias="int")
    rec: int | None = None
    tackles: int | None = None
    sacks: float | None = None
    ff: int | None = None
    fgm: int | None = None
    fga: int | None = None
    xpm: int | None = None
    xpa: int | None = None


class BoxScore(_Frozen):
    passing: list[BoxScoreEntry] = Field(default_factory=list)
    rushing: list[BoxScoreEntry] = Field(default_factory=list)
    receiving: list[BoxScoreEntry] = Field(default_factory=list)
    defense: list[BoxScoreEntry] = Field(default_factory=list)


class QuarterScores(_Frozen):
    home: list[int] = Field(default_factory=list)
    away: list[int] = Field(default_factory=list)


class Game(_Frozen):
    id: str
    season: str
    week: int = Field(ge=0)
    date: str
    homeTeamId: str
    awayTeamId: str
    homeScore: int | None = None
    awayScore: int | None = None
    quarterScores: QuarterScores = Field(default_factory=QuarterScores)
    status: GameStatus
    dataStatus: DataStatus
    venue: str | None = None
    boxScore: BoxScore | None = None
    maxprepsUrl: str | None = None

    @field_validator("season")
    @classmethod
    def _valid_season(cls, v: str) -> str:
        if not _SEASON_PATTERN.match(v):
            raise ValueError(f"invalid season: {v}")
        return v

    @field_validator("date")
    @classmethod
    def _valid_date(cls, v: str) -> str:
        if not _DATE_PATTERN.match(v):
            raise ValueError(f"invalid date: {v}")
        return v

    @model_validator(mode="after")
    def _complete_requires_box(self) -> Game:
        if self.dataStatus == "complete" and self.boxScore is None:
            raise ValueError("dataStatus=complete requires a boxScore")
        return self
