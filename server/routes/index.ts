import { Router } from 'express';
import GithubAPI from '../api/github';
import TheMovieDb from '../api/themoviedb';
import { StatusResponse } from '../interfaces/api/settingsInterfaces';
import { Permission } from '../lib/permissions';
import { getSettings } from '../lib/settings';
import { checkUser, isAuthenticated } from '../middleware/auth';
import { mapProductionCompany } from '../models/Movie';
import { mapNetwork } from '../models/Tv';
import { appDataPath, appDataStatus } from '../utils/appDataVolume';
import { getAppVersion, getCommitTag } from '../utils/appVersion';
import authRoutes from './auth';
import collectionRoutes from './collection';
import discoverRoutes from './discover';
import mediaRoutes from './media';
import movieRoutes from './movie';
import personRoutes from './person';
import requestRoutes from './request';
import searchRoutes from './search';
import serviceRoutes from './service';
import settingsRoutes from './settings';
import tvRoutes from './tv';
import user from './user';

const router = Router();

router.use(checkUser);

router.get<unknown, StatusResponse>('/status', async (req, res) => {
  const githubApi = new GithubAPI();

  const currentVersion = getAppVersion();
  const commitTag = getCommitTag();
  let updateAvailable = false;
  let commitsBehind = 0;

  if (currentVersion.startsWith('develop-') && commitTag !== 'local') {
    const commits = await githubApi.getOverseerrCommits();

    if (commits.length) {
      const filteredCommits = commits.filter(
        (commit) => !commit.commit.message.includes('[skip ci]')
      );
      if (filteredCommits[0].sha !== commitTag) {
        updateAvailable = true;
      }

      const commitIndex = filteredCommits.findIndex(
        (commit) => commit.sha === commitTag
      );

      if (updateAvailable) {
        commitsBehind = commitIndex;
      }
    }
  } else if (commitTag !== 'local') {
    const releases = await githubApi.getOverseerrReleases();

    if (releases.length) {
      const latestVersion = releases[0];

      if (!latestVersion.name.includes(currentVersion)) {
        updateAvailable = true;
      }
    }
  }

  return res.status(200).json({
    version: getAppVersion(),
    commitTag: getCommitTag(),
    updateAvailable,
    commitsBehind,
  });
});

router.get('/status/appdata', (_req, res) => {
  return res.status(200).json({
    appData: appDataStatus(),
    appDataPath: appDataPath(),
  });
});

router.use('/user', isAuthenticated(), user);
router.get('/settings/public', async (_req, res) => {
  const settings = getSettings();

  return res.status(200).json(settings.fullPublicSettings);
});
router.use(
  '/settings',
  isAuthenticated(Permission.MANAGE_SETTINGS),
  settingsRoutes
);
router.use('/search', isAuthenticated(), searchRoutes);
router.use('/discover', isAuthenticated(), discoverRoutes);
router.use('/request', isAuthenticated(), requestRoutes);
router.use('/movie', isAuthenticated(), movieRoutes);
router.use('/tv', isAuthenticated(), tvRoutes);
router.use('/media', isAuthenticated(), mediaRoutes);
router.use('/person', isAuthenticated(), personRoutes);
router.use('/collection', isAuthenticated(), collectionRoutes);
router.use('/service', isAuthenticated(), serviceRoutes);
router.use('/auth', authRoutes);

router.get('/regions', isAuthenticated(), async (req, res) => {
  const tmdb = new TheMovieDb();

  const regions = await tmdb.getRegions();

  return res.status(200).json(regions);
});

router.get('/languages', isAuthenticated(), async (req, res) => {
  const tmdb = new TheMovieDb();

  const languages = await tmdb.getLanguages();

  return res.status(200).json(languages);
});

router.get<{ id: string }>('/studio/:id', async (req, res) => {
  const tmdb = new TheMovieDb();

  const studio = await tmdb.getStudio(Number(req.params.id));

  return res.status(200).json(mapProductionCompany(studio));
});

router.get<{ id: string }>('/network/:id', async (req, res) => {
  const tmdb = new TheMovieDb();

  const network = await tmdb.getNetwork(Number(req.params.id));

  return res.status(200).json(mapNetwork(network));
});

router.get('/genres/movie', isAuthenticated(), async (req, res) => {
  const tmdb = new TheMovieDb();

  const genres = await tmdb.getMovieGenres({
    language: req.locale ?? (req.query.language as string),
  });

  return res.status(200).json(genres);
});

router.get('/genres/tv', isAuthenticated(), async (req, res) => {
  const tmdb = new TheMovieDb();

  const genres = await tmdb.getTvGenres({
    language: req.locale ?? (req.query.language as string),
  });

  return res.status(200).json(genres);
});

router.get('/', (_req, res) => {
  return res.status(200).json({
    api: 'Overseerr API',
    version: '1.0',
  });
});

export default router;
