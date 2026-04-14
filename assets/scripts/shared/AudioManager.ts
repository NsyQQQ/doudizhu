/**
 * 音频管理器
 */

import { _decorator, Component, AudioSource } from 'cc';
import { resources, AudioClip } from 'cc';

import { Card, CardPatternType } from '../core/Card';
import { CardPatternType2, isBomb, isRocket } from '../core/CardPattern2';

const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static instance: AudioManager;

    @property(AudioSource)
    bgmSource: AudioSource = null!;

    @property(AudioSource)
    sfxSource: AudioSource = null!;

    private _bgmVolume: number = 0.5;
    private _sfxVolume: number = 0.5;
    private _currentBGMPath: string = '';
    private _isBGMPlaying: boolean = false;
    private _lastSFXPath: string = '';
    private _lastSFXTime: number = 0;
    private _sfxCache: Map<string, AudioClip> = new Map();  // SFX缓存

    /** 获取单例 */
    static getInstance(): AudioManager {
        return this.instance;
    }

    onLoad() {
        if (AudioManager.instance && AudioManager.instance !== this) {
            this.destroy();
            return;
        }
        AudioManager.instance = this;
    }

    /** 清除音效缓存（供外部调用） */
    clearSFXCache(): void {
        this._sfxCache.clear();
    }

    onDestroy() {
        if (AudioManager.instance === this) {
            AudioManager.instance = null;
        }
    }

    /**
     * 播放背景音乐
     * @param clipPath 音频clip路径，相对于 resources（不带扩展名）
     * @param loop 是否循环
     */
    playBGM(clipPath: string, loop: boolean = true): void {
        if (this._currentBGMPath === clipPath && this._isBGMPlaying) {
            return; // 已经在播放同一个音乐
        }

        this._currentBGMPath = clipPath;

        if (!this.bgmSource) {
            console.error('[AudioManager] bgmSource is not assigned');
            return;
        }

        this.bgmSource.volume = this._bgmVolume;
        this.bgmSource.loop = loop;
        this.bgmSource.play();
        this._isBGMPlaying = true;
        console.log('[AudioManager] BGM started:', clipPath);
    }

    /**
     * 设置背景音乐音量
     */
    setBGMVolume(volume: number): void {
        this._bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.bgmSource) {
            this.bgmSource.volume = this._bgmVolume;
        }
    }

    /**
     * 获取背景音乐音量
     */
    getBGMVolume(): number {
        return this._bgmVolume;
    }

    /**
     * 暂停背景音乐
     */
    pauseBGM(): void {
        if (this.bgmSource) {
            this.bgmSource.pause();
            this._isBGMPlaying = false;
        }
    }

    /**
     * 恢复背景音乐
     */
    resumeBGM(): void {
        if (this.bgmSource) {
            this.bgmSource.play();
            this._isBGMPlaying = true;
        }
    }

    /**
     * 停止背景音乐
     */
    stopBGM(): void {
        if (this.bgmSource) {
            this.bgmSource.stop();
            this._isBGMPlaying = false;
            this._currentBGMPath = '';
        }
    }

    /**
     * 是否正在播放
     */
    isBGMPlaying(): boolean {
        return this._isBGMPlaying;
    }

    /**
     * 播放音效
     * @param clipPath 音频clip路径，相对于 resources（不带扩展名）
     */
    playSFX(clipPath: string): void {
        if (!clipPath) return;
        console.log('[AudioManager] playSFX:', clipPath);

        const now = Date.now();
        if (this._lastSFXPath === clipPath && now - this._lastSFXTime < 300) return;
        this._lastSFXPath = clipPath;
        this._lastSFXTime = now;

        // 使用sfxSource播放音效
        if (!this.sfxSource) {
            console.error('[AudioManager] sfxSource is not assigned');
            return;
        }

        // 先从缓存查找
        const cachedClip = this._sfxCache.get(clipPath);
        if (cachedClip) {
            this.sfxSource.clip = cachedClip;
            this.sfxSource.volume = this._sfxVolume;
            this.sfxSource.play();
            return;
        }

        // 缓存没有则从resources加载
        resources.load(clipPath, AudioClip, (err: Error | null, clip: AudioClip) => {
            if (err) {
                console.warn('[AudioManager] failed to load sfx:', clipPath, err);
                return;
            }
            this._sfxCache.set(clipPath, clip);
            this.sfxSource.clip = clip;
            this.sfxSource.volume = this._sfxVolume;
            this.sfxSource.play();
        });
    }
    /**
     * 设置音效音量
     */
    setSFXVolume(volume: number): void {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxSource) {
            this.sfxSource.volume = this._sfxVolume;
        }
    }

    /**
     * 获取音效音量
     */
    getSFXVolume(): number {
        return this._sfxVolume;
    }

    /**
     * 播放牌型对应音效（3人场/6人场通用）
     * @param patternType 牌型枚举值（CardPatternType 或 CardPatternType2）
     */
    playCardSFX(patternType: CardPatternType | CardPatternType2, cards?: Card[]): void {
        if (patternType === undefined || patternType === CardPatternType.INVALID || patternType === CardPatternType.PASS) {
            return;
        }

        let sfxPath = '';
        switch (patternType) {
            case CardPatternType.SINGLE:
            case CardPatternType2.SINGLE:
                sfxPath = this.getSingleCardSFX(cards);
                break;
            case CardPatternType.PAIR:
            case CardPatternType2.PAIR:
                sfxPath = this.getPairCardSFX(cards);
                break;
            case CardPatternType.TRIPLE:
            case CardPatternType2.TRIPLE:
                sfxPath = 'audio/Fight/Woman_tuple3';
                break;
            case CardPatternType.TRIPLE_SINGLE:
            case CardPatternType2.TRIPLE_SINGLE:
                sfxPath = 'audio/Fight/Woman_sandaiyi';
                break;
            case CardPatternType.TRIPLE_PAIR:
            case CardPatternType2.TRIPLE_PAIR:
                sfxPath = 'audio/Fight/Woman_sandaiyidui';
                break;
            case CardPatternType.STRAIGHT:
            case CardPatternType2.STRAIGHT:
                sfxPath = 'audio/Fight/Woman_shunzi';
                break;
            case CardPatternType.STRAIGHT_PAIRS:
            case CardPatternType2.STRAIGHT_PAIRS:
                sfxPath = 'audio/Fight/Woman_liandui';
                break;
            case CardPatternType.STRAIGHT_TRIPLES:
            case CardPatternType2.STRAIGHT_TRIPLES:
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE:
            case CardPatternType2.STRAIGHT_TRIPLES_WITH_WINGS_SINGLE:
            case CardPatternType.STRAIGHT_TRIPLES_WITH_WINGS_PAIR:
            case CardPatternType2.STRAIGHT_TRIPLES_WITH_WINGS_PAIR:
                sfxPath = 'audio/Fight/Woman_feiji';
                break;
            default:
                if (isBomb(patternType)) {
                    sfxPath = 'audio/Fight/Woman_zhadan';
                } else if (isRocket(patternType)) {
                    sfxPath = 'audio/Fight/Woman_wangzha';
                } else {
                    return;
                }
        }

        this.playSFX(sfxPath);
    }

    /** 获取单张牌对应的音效路径 */
    private getSingleCardSFX(cards?: Card[]): string {
        if (!cards || cards.length === 0) return '';
        const rank = cards[0].rank;
        return `audio/Fight/Woman_${rank}`;
    }

    /** 获取对子牌对应的音效路径 */
    private getPairCardSFX(cards?: Card[]): string {
        if (!cards || cards.length === 0) return '';
        const rank = cards[0].rank;
        return `audio/Fight/Woman_dui${rank}`;
    }
}
