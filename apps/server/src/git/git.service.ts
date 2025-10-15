import { Injectable, Logger } from '@nestjs/common';
import simpleGit from 'simple-git'
import { join } from 'path'
import { existsSync, rmSync } from 'fs';

@Injectable()
export class GitService {

    private readonly logger = new Logger(GitService.name)

    async cloneRepository(repoUrl: string, repoName: string) {
        const targetDir = this.getTargetDir(repoName);

        this.logger.log('cloning repo...')
        const git = simpleGit()

        try {
            await git.clone(repoUrl, targetDir)
            this.logger.log('repo successfully cloned')
        } catch(error) {
            this.logger.error('Error trying to clone the repo', error)
            throw error
        }


    }

    private getTargetDir(repoName: string) {
        const targetDir = join('/tmp', repoName);

        if (existsSync(targetDir)) {
            this.logger.warn('The folder already exists, it will be overwritten');
            rmSync(targetDir, { recursive: true, force: true });
        }
        return targetDir;
    }
}
